// App shell: navigation, re-rendering, clock ticks, wake lock, feeds and screensaver.
import { store } from './store.js';
import { $, esc } from './util.js';
import { requirePin, toast } from './ui.js';
import { parseICS } from './ics.js';
import { fetchText } from './services.js';
import { initIdle, applyNightDim } from './photos.js';
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
store.subscribe(() => { applyTheme(); render(false); });

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

// ---------- calendar feeds ----------
let feedBusy = false;
async function refreshFeeds(force) {
  if (feedBusy) return;
  const feeds = store.state.feeds;
  if (!feeds.length) return;
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
  feedBusy = false;
  store.save();
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
