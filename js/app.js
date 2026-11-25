// App shell: navigation, re-rendering, clock ticks, wake lock, feeds and screensaver.
import { store } from './store.js';
import { $, esc } from './util.js';
import { requirePin, toast } from './ui.js';
import { parseICS } from './ics.js';
import { fetchText } from './services.js';
import { initIdle, applyNightDim } from './photos.js';
import { refreshGoogleCalendars, accountsNeedingReconnect, reconnectGoogleAccount } from './google.js';
import * as today from './views/today.js';
import * as calendar from './views/calendar.js';
import * as chores from './views/chores.js';
import * as meals from './views/meals.js';
import * as lists from './views/lists.js';
import * as rewards from './views/rewards.js';
import * as settings from './views/settings.js';

const VIEWS = {
  today: { mod: today, icon: '🏠', label: 'Home' },
  calendar: { mod: calendar, icon: '📅', label: 'Calendar' },
  chores: { mod: chores, icon: '✅', label: 'Chores' },
  meals: { mod: meals, icon: '🍽️', label: 'Meals' },
  lists: { mod: lists, icon: '🛒', label: 'Lists' },
  rewards: { mod: rewards, icon: '⭐', label: 'Rewards' },
  settings: { mod: settings, icon: '⚙️', label: 'Settings' },
};

let current = 'today';
let unlockedUntil = 0;
const main = $('#main');
const ctx = { refreshFeeds, onSettings };

function nav() {
  $('#nav').innerHTML = `<div class="brand" title="${esc(store.state.settings.familyName)}">🏡</div>` +
    Object.entries(VIEWS).map(([k, v]) => `<button class="${k === current ? 'on' : ''}" data-go="${k}" aria-label="${v.label}"><span>${v.icon}</span><small>${v.label}</small></button>`).join('');
}

async function go(name) {
  if (!VIEWS[name]) name = 'today';
  if (name === 'settings' && store.state.settings.pin && Date.now() > unlockedUntil) {
    if (!(await requirePin('Open settings'))) return;
    unlockedUntil = Date.now() + 5 * 60000;
  }
  current = name;
  if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
  render(true);
}

function render(scrollTop) {
  nav();
  document.title = `${store.state.settings.familyName} · Family Hub`;
  const y = main.scrollTop;
  main.dataset.view = current;
  VIEWS[current].mod.render(main, go, ctx);
  main.scrollTop = scrollTop ? 0 : y;
}

$('#nav').addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
store.subscribe(() => { applyTheme(); render(false); updateGoogleChip(); });

// ---------- theme ----------
function applyTheme() {
  const t = store.state.settings.theme;
  document.documentElement.dataset.theme = t === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
}
matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// ---------- keep the screen awake ----------
let wake = null;
async function keepAwake() {
  if (!('wakeLock' in navigator) || !store.state.settings.keepAwake || document.visibilityState !== 'visible') return;
  try { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } catch (e) { /* needs a tap first on some browsers */ }
}
document.addEventListener('visibilitychange', keepAwake);
document.addEventListener('pointerdown', () => { if (!wake) keepAwake(); }, { passive: true });

function onSettings(key) {
  if (key === 'keepAwake') { if (store.state.settings.keepAwake) keepAwake(); else if (wake) wake.release(); }
  if (key.startsWith('night')) applyNightDim();
}

// ---------- calendar feeds (iCal + Google) ----------
let feedBusy = false;
async function refreshFeeds(force) {
  if (feedBusy) return;
  const feeds = store.state.feeds;
  const hasGoogle = (store.state.googleAccounts || []).length;
  if (!feeds.length && !hasGoogle) return;
  feedBusy = true;
  for (const f of feeds) {
    if (!force && f.last && Date.now() - f.last < 30 * 60000) continue;
    try {
      const text = await fetchText(f.url);
      if (!/BEGIN:VCALENDAR/.test(text)) throw new Error('That address did not return a calendar');
      const evs = parseICS(text, { feedId: f.id, memberIds: f.memberId ? [f.memberId] : [] });
      store.state.feedEvents[f.id] = evs.map((e) => { delete e.uidRef; return e; });
      Object.assign(f, { last: Date.now(), error: '' });
    } catch (e) {
      f.error = String(e.message || e).slice(0, 140);
      if (force) toast(`${f.name}: ${f.error}`);
    }
  }
  try { await refreshGoogleCalendars(force); }
  catch (e) { if (force) toast('Google calendars: ' + String(e.message || e).slice(0, 140)); }
  feedBusy = false;
  store.save();
  updateGoogleChip();
}

function updateGoogleChip() {
  const need = accountsNeedingReconnect();
  let chip = document.getElementById('gcal-chip');
  if (!need.length) {
    if (chip) chip.hidden = true;
    return;
  }
  if (!chip) {
    chip = document.createElement('button');
    chip.id = 'gcal-chip';
    chip.type = 'button';
    chip.className = 'gcal-chip';
    document.body.appendChild(chip);
    chip.addEventListener('click', async () => {
      const next = accountsNeedingReconnect()[0];
      if (!next) return;
      chip.disabled = true;
      chip.textContent = 'Reconnecting…';
      try {
        await reconnectGoogleAccount(next.email);
        toast('Reconnected ' + next.email);
      } catch (e) {
        if (!e || e.code !== 'auth-cancelled') toast('Could not reconnect Google — try again');
      } finally {
        chip.disabled = false;
        updateGoogleChip();
      }
    });
  }
  chip.hidden = false;
  chip.textContent = need.length === 1
    ? 'Tap to reconnect Google'
    : 'Tap to reconnect Google (' + need.length + ')';
  chip.title = need.map((a) => a.email).join(', ');
  chip.setAttribute('aria-label', 'Tap to reconnect Google' + (need[0] ? ' (' + need[0].email + ')' : ''));
}

// ---------- clock: refresh the screen each minute, full re-render every 5 ----------
let ticks = 0, lastMinute = new Date().getMinutes();
setInterval(() => {
  if (new Date().getMinutes() === lastMinute) return;
  lastMinute = new Date().getMinutes();
  ticks++;
  applyNightDim();
  const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  const modalOpen = document.querySelector('.modal-wrap');
  if (current === 'today') {
    if (ticks % 5 === 0 && !typing && !modalOpen) render(false); else today.tick(main);
  }
  if (ticks % 30 === 0) refreshFeeds(false);
  // roll over at midnight
  if (new Date().getHours() === 0 && new Date().getMinutes() === 0 && !modalOpen) render(false);
}, 5000);

// ---------- boot ----------
applyTheme();
applyNightDim();
go(location.hash.slice(1) || 'today');
initIdle();
keepAwake();
refreshFeeds(false);
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h !== current) go(h); });

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
