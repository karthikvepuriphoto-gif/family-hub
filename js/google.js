// Google sign-in (GIS token client) and read-only Calendar API.
// Access tokens stay in memory only; localStorage keeps email + calendar choices.
import { store } from './store.js';
import { toLocal, addDays, startOfDay, parseYmd } from './util.js';

export const GOOGLE_CLIENT_ID = '530224183851-8gp2uth9coig5tseijcipvr60a5ksnam.apps.googleusercontent.com';
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const SCOPES = CALENDAR_SCOPE + ' https://www.googleapis.com/auth/userinfo.email';
const API = 'https://www.googleapis.com/calendar/v3';
const WINDOW_BACK = 7;
const WINDOW_FORWARD = 60;

const tokens = new Map(); // email -> { accessToken, expiresAt }
let gisPromise = null;
let tokenChain = Promise.resolve();

export function feedKey(email, calendarId) {
  return 'gcal:' + String(email).toLowerCase() + ':' + calendarId;
}

export function googleAccounts() {
  return store.state.googleAccounts || [];
}

export function accountsNeedingReconnect() {
  return googleAccounts().filter((a) => a.needsReconnect);
}

function peekToken(email) {
  const t = tokens.get(String(email).toLowerCase());
  if (t && t.expiresAt > Date.now() + 60_000) return t.accessToken;
  if (t) tokens.delete(String(email).toLowerCase());
  return null;
}

function rememberToken(email, response) {
  tokens.set(String(email).toLowerCase(), {
    accessToken: response.access_token,
    expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
  });
}

function forgetToken(email) {
  tokens.delete(String(email).toLowerCase());
}

export function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisPromise = null;
        reject(new Error('Could not load Google sign-in'));
      };
      document.head.appendChild(script);
    });
  }
  return gisPromise;
}

function requestAccessToken({ prompt, hint }) {
  const google = window.google;
  if (!google?.accounts?.oauth2) return Promise.reject(new Error('Could not load Google sign-in'));
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, value) => { if (!settled) { settled = true; fn(value); } };
    const timer = window.setTimeout(() => done(reject, cancelled('auth-timeout')), 90_000);
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      hint: hint || '',
      include_granted_scopes: true,
      callback: (response) => {
        window.clearTimeout(timer);
        if (!response.access_token || response.error) {
          done(reject, cancelled(response.error === 'access_denied' ? 'auth-cancelled' : (response.error || 'auth-failed')));
          return;
        }
        done(resolve, response);
      },
      error_callback: (err) => {
        window.clearTimeout(timer);
        const type = err && err.type;
        done(reject, cancelled(type === 'popup_closed' ? 'auth-cancelled' : (type || 'auth-failed')));
      },
    });
    try {
      client.requestAccessToken({ prompt: prompt ?? '' });
    } catch (e) {
      window.clearTimeout(timer);
      done(reject, e instanceof Error ? e : cancelled('auth-failed'));
    }
  });
}

function cancelled(code) {
  const e = new Error(code === 'auth-cancelled' ? 'auth-cancelled' : code === 'auth-timeout' ? 'Sign-in timed out' : 'Google sign-in failed');
  e.code = code;
  return e;
}

function enqueueToken(fn) {
  const run = tokenChain.then(fn, fn);
  tokenChain = run.then(() => {}, () => {});
  return run;
}

async function obtainToken({ interactive, hint }) {
  await loadGis();
  return enqueueToken(() => requestAccessToken({
    prompt: interactive ? 'select_account' : '',
    hint: hint || '',
  }));
}

async function fetchEmail(token) {
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 401) { const e = new Error('unauthorized'); e.code = 'unauthorized'; throw e; }
  if (!r.ok) throw new Error('Could not read the Google account email');
  const data = await r.json();
  return String(data.email || '').trim().toLowerCase();
}

async function apiGet(token, url) {
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 401) { const e = new Error('unauthorized'); e.code = 'unauthorized'; throw e; }
  if (!r.ok) {
    let detail = r.status + ' ' + r.statusText;
    try { const j = await r.json(); if (j.error && j.error.message) detail = j.error.message; } catch (e) { /* ignore */ }
    throw new Error(detail);
  }
  return r.json();
}

async function fetchAllPages(token, url, key) {
  const out = [];
  let next = url;
  for (let i = 0; i < 10 && next; i++) {
    const j = await apiGet(token, next);
    out.push(...(j[key] || []));
    next = j.nextPageToken ? url + (url.includes('?') ? '&' : '?') + 'pageToken=' + encodeURIComponent(j.nextPageToken) : '';
  }
  return out;
}

async function fetchCalendarList(token) {
  const items = await fetchAllPages(token, API + '/users/me/calendarList?minAccessRole=reader&maxResults=250', 'items');
  return items.filter((c) => c && c.id && !c.deleted);
}

function mergeCalendars(oldList, fresh) {
  const prev = new Map((oldList || []).map((c) => [c.id, c]));
  return fresh.map((c) => {
    const o = prev.get(c.id);
    return {
      id: c.id,
      summary: c.summaryOverride || c.summary || c.id,
      primary: !!c.primary,
      selected: o ? !!o.selected : !!c.primary,
      memberId: o ? (o.memberId || '') : '',
    };
  });
}

function findAccount(email) {
  const k = String(email).toLowerCase();
  return googleAccounts().find((a) => a.email === k);
}

function markReconnect(email, needed) {
  const a = findAccount(email);
  if (!a || !!a.needsReconnect === !!needed) return;
  store.update((s) => {
    const x = (s.googleAccounts || []).find((y) => y.email === String(email).toLowerCase());
    if (x) x.needsReconnect = !!needed;
  });
}

function upsertAccount(email, list, { keepSelections = true } = {}) {
  store.update((s) => {
    if (!s.googleAccounts) s.googleAccounts = [];
    let a = s.googleAccounts.find((x) => x.email === email);
    if (!a) {
      a = { email, calendars: mergeCalendars([], list), last: 0, needsReconnect: false, error: '' };
      s.googleAccounts.push(a);
    } else {
      a.calendars = mergeCalendars(keepSelections ? a.calendars : [], list);
      a.needsReconnect = false;
      a.error = '';
    }
  });
  return findAccount(email);
}

function mapEvent(item, cal, email) {
  if (!item || item.status === 'cancelled' || !item.start) return null;
  const startRaw = item.start;
  const endRaw = item.end || {};
  const allDay = !!startRaw.date && !startRaw.dateTime;
  let start, end;
  if (allDay) {
    start = parseYmd(startRaw.date);
    end = endRaw.date ? parseYmd(endRaw.date) : addDays(start, 1);
  } else {
    start = new Date(startRaw.dateTime || startRaw.date);
    end = (endRaw.dateTime || endRaw.date) ? new Date(endRaw.dateTime || endRaw.date) : new Date(start.getTime() + 3600000);
  }
  if (isNaN(+start)) return null;
  if (isNaN(+end)) end = new Date(start.getTime() + 3600000);
  const notes = String(item.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    id: 'g:' + email + ':' + (item.id || item.iCalUID || Math.random().toString(36).slice(2)),
    title: item.summary || '(No title)',
    start: toLocal(start),
    end: toLocal(end),
    allDay,
    location: item.location || '',
    notes: notes.slice(0, 500),
    repeat: 'none',
    memberIds: cal.memberId ? [cal.memberId] : [],
    feedId: feedKey(email, cal.id),
    feedName: cal.summary + ' (' + email + ')',
  };
}

async function fetchEvents(token, cal, email) {
  const from = addDays(startOfDay(new Date()), -WINDOW_BACK);
  const to = addDays(startOfDay(new Date()), WINDOW_FORWARD);
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    maxResults: '2500',
  });
  const url = API + '/calendars/' + encodeURIComponent(cal.id) + '/events?' + params;
  const items = await fetchAllPages(token, url, 'items');
  return items.map((item) => mapEvent(item, cal, email)).filter(Boolean);
}

async function tokenFor(email, { interactive = false } = {}) {
  if (!interactive) {
    const cached = peekToken(email);
    if (cached) return cached;
  }
  const resp = await obtainToken({ interactive, hint: email || '' });
  const got = await fetchEmail(resp.access_token);
  if (!got) throw new Error('Could not read the Google account email');
  rememberToken(got, resp);
  if (email && got !== String(email).toLowerCase()) {
    const e = new Error('wrong-account');
    e.code = 'wrong-account';
    e.email = got;
    e.response = resp;
    throw e;
  }
  return resp.access_token;
}

async function afterSignIn(email, token, { keepSelections = true } = {}) {
  const list = await fetchCalendarList(token);
  upsertAccount(email, list, { keepSelections });
  markReconnect(email, false);
  await pullAccountEvents(email, token);
}

async function pullAccountEvents(email, token) {
  const account = findAccount(email);
  if (!account) return;
  const selected = (account.calendars || []).filter((c) => c.selected);
  const evMap = {};
  const errors = [];
  for (const cal of selected) {
    try {
      evMap[feedKey(email, cal.id)] = await fetchEvents(token, cal, email);
    } catch (e) {
      if (e.code === 'unauthorized') throw e;
      errors.push((cal.summary || cal.id) + ': ' + String(e.message || e).slice(0, 80));
    }
  }
  store.update((s) => {
    const a = (s.googleAccounts || []).find((x) => x.email === email);
    if (a) {
      a.last = Date.now();
      a.needsReconnect = false;
      a.error = errors.join(' · ');
    }
    if (!s.feedEvents) s.feedEvents = {};
    const prefix = 'gcal:' + email + ':';
    for (const k of Object.keys(s.feedEvents)) {
      if (k.startsWith(prefix) && evMap[k] === undefined) delete s.feedEvents[k];
    }
    Object.assign(s.feedEvents, evMap);
  });
}

/** Interactive sign-in; supports more than one Google account on the same device. */
export async function connectGoogleAccount() {
  const resp = await obtainToken({ interactive: true, hint: '' });
  const email = await fetchEmail(resp.access_token);
  if (!email) throw new Error('Could not read the Google account email');
  rememberToken(email, resp);
  const existing = findAccount(email);
  await afterSignIn(email, resp.access_token, { keepSelections: !!existing });
  return email;
}

/** Interactive re-auth for an account whose silent token refresh failed. */
export async function reconnectGoogleAccount(email) {
  const want = String(email).toLowerCase();
  try {
    const token = await tokenFor(want, { interactive: true });
    await afterSignIn(want, token, { keepSelections: true });
    return want;
  } catch (e) {
    if (e.code === 'wrong-account' && e.email) {
      rememberToken(e.email, e.response);
      const existing = findAccount(e.email);
      await afterSignIn(e.email, e.response.access_token, { keepSelections: !!existing });
      markReconnect(want, true);
      return e.email;
    }
    throw e;
  }
}

export async function disconnectGoogleAccount(email) {
  const key = String(email).toLowerCase();
  const t = tokens.get(key);
  forgetToken(key);
  if (t && window.google?.accounts?.oauth2?.revoke) {
    try { window.google.accounts.oauth2.revoke(t.accessToken, () => {}); } catch (e) { /* ignore */ }
  }
  store.update((s) => {
    s.googleAccounts = (s.googleAccounts || []).filter((a) => a.email !== key);
    if (!s.feedEvents) return;
    const prefix = 'gcal:' + key + ':';
    for (const k of Object.keys(s.feedEvents)) if (k.startsWith(prefix)) delete s.feedEvents[k];
  });
}

export function setCalendarSelected(email, calendarId, selected) {
  const key = String(email).toLowerCase();
  store.update((s) => {
    const a = (s.googleAccounts || []).find((x) => x.email === key);
    const c = a && (a.calendars || []).find((x) => x.id === calendarId);
    if (c) c.selected = !!selected;
    if (!selected && s.feedEvents) delete s.feedEvents[feedKey(key, calendarId)];
  });
}

export function setCalendarMember(email, calendarId, memberId) {
  const key = String(email).toLowerCase();
  store.update((s) => {
    const a = (s.googleAccounts || []).find((x) => x.email === key);
    const c = a && (a.calendars || []).find((x) => x.id === calendarId);
    if (c) c.memberId = memberId || '';
    const evs = s.feedEvents && s.feedEvents[feedKey(key, calendarId)];
    if (evs) evs.forEach((ev) => { ev.memberIds = memberId ? [memberId] : []; });
  });
}

export async function refreshSelectedCalendar(email, calendarId) {
  const key = String(email).toLowerCase();
  const account = findAccount(key);
  const cal = account && (account.calendars || []).find((c) => c.id === calendarId);
  if (!cal || !cal.selected) return;
  const token = await tokenFor(key, { interactive: false });
  markReconnect(key, false);
  const evs = await fetchEvents(token, cal, key);
  store.update((s) => {
    if (!s.feedEvents) s.feedEvents = {};
    s.feedEvents[feedKey(key, calendarId)] = evs;
  });
}

/**
 * Refresh events for connected Google accounts.
 * On expiry, tries a silent token request (prompt: '', with login hint).
 * If that fails, keeps cached events and sets needsReconnect.
 */
export async function refreshGoogleCalendars(force = false, onlyEmail = null) {
  const accounts = googleAccounts().filter((a) => !onlyEmail || a.email === String(onlyEmail).toLowerCase());
  if (!accounts.length) return;
  for (const account of accounts.slice()) {
    if (!force && account.last && Date.now() - account.last < 30 * 60000 && !account.needsReconnect) continue;
    let token;
    try {
      token = await tokenFor(account.email, { interactive: false });
      markReconnect(account.email, false);
    } catch (e) {
      if (e.code === 'wrong-account') {
        markReconnect(account.email, true);
        continue;
      }
      markReconnect(account.email, true);
      continue;
    }
    try {
      if (force) {
        const list = await fetchCalendarList(token);
        upsertAccount(account.email, list, { keepSelections: true });
      }
      await pullAccountEvents(account.email, token);
    } catch (e) {
      if (e.code === 'unauthorized') {
        forgetToken(account.email);
        markReconnect(account.email, true);
        continue;
      }
      store.update((s) => {
        const a = (s.googleAccounts || []).find((x) => x.email === account.email);
        if (a) a.error = String(e.message || e).slice(0, 140);
      });
    }
  }
}
