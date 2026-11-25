// App state: one JSON document in localStorage, plus helpers that read it.
import { uid, ymd, parseYmd, parseLocal, toLocal, addDays, startOfDay, DAY_MS } from './util.js';

const KEY = 'familyhub.v1';
export const COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#f08c00', '#0ca678', '#e64980', '#4263eb', '#868e96'];
export const FAMILY_COLOR = '#5c6b7a';

function demo() {
  const today = startOfDay(new Date());
  const at = (dayOffset, h, m = 0) => { const d = addDays(today, dayOffset); d.setHours(h, m); return toLocal(d); };
  const m = [
    { id: uid(), name: 'Mom', color: COLORS[0], emoji: '🌻', kid: false },
    { id: uid(), name: 'Dad', color: COLORS[1], emoji: '🧢', kid: false },
    { id: uid(), name: 'Kiddo', color: COLORS[2], emoji: '🐬', kid: true },
  ];
  const [mom, dad, kid] = m.map((x) => x.id);
  const groceries = { id: uid(), name: 'Groceries', kind: 'shopping', items: ['Milk', 'Bananas', 'Bread', 'Eggs'].map((t) => ({ id: uid(), text: t, done: false })) };
  return {
    version: 1,
    sample: true,
    members: m,
    events: [
      { id: uid(), title: 'School drop-off', start: at(0, 7, 45), end: at(0, 8, 15), memberIds: [dad, kid], repeat: 'weekdays' },
      { id: uid(), title: 'Swim lesson', start: at(1, 17, 0), end: at(1, 18, 0), memberIds: [kid, mom], repeat: 'weekly', location: 'Community pool' },
      { id: uid(), title: 'Team standup', start: at(0, 9, 30), end: at(0, 10, 0), memberIds: [mom], repeat: 'weekdays' },
      { id: uid(), title: 'Family movie night', start: at(3, 19, 0), end: at(3, 21, 0), memberIds: [], repeat: 'none' },
    ],
    feeds: [],
    feedEvents: {},
    chores: [
      { id: uid(), title: 'Make bed', emoji: '🛏️', memberIds: [kid], routine: 'morning', days: [0, 1, 2, 3, 4, 5, 6], stars: 1 },
      { id: uid(), title: 'Brush teeth', emoji: '🪥', memberIds: [kid], routine: 'morning', days: [0, 1, 2, 3, 4, 5, 6], stars: 1 },
      { id: uid(), title: 'Pack school bag', emoji: '🎒', memberIds: [kid], routine: 'afternoon', days: [0, 1, 2, 3, 4], stars: 1 },
      { id: uid(), title: 'Reading 20 min', emoji: '📚', memberIds: [kid], routine: 'evening', days: [0, 1, 2, 3, 4, 5, 6], stars: 2 },
      { id: uid(), title: 'Clear the table', emoji: '🍽️', memberIds: [kid, dad], routine: 'evening', days: [0, 1, 2, 3, 4, 5, 6], stars: 1 },
      { id: uid(), title: 'Take out trash', emoji: '🗑️', memberIds: [dad], routine: 'anytime', days: [2], stars: 1 },
    ],
    choreLog: {},
    ledger: [],
    rewards: [
      { id: uid(), title: 'Extra screen time (30 min)', emoji: '📺', cost: 10 },
      { id: uid(), title: 'Pick dinner', emoji: '🍕', cost: 15 },
      { id: uid(), title: 'Trip to the aquarium', emoji: '🐬', cost: 60 },
    ],
    meals: {},
    recipes: [
      { id: uid(), title: 'Veggie fried rice', ingredients: ['Cooked rice', 'Eggs', 'Frozen peas & carrots', 'Soy sauce', 'Green onions'], steps: 'Scramble eggs, set aside. Stir-fry veggies, add rice and soy sauce, fold in eggs and onions.', url: '', tags: ['quick'], lastCooked: '' },
    ],
    lists: [groceries, { id: uid(), name: 'To-do', kind: 'todo', items: [{ id: uid(), text: 'Book dentist appointment', done: false, memberId: mom }] }],
    settings: {
      familyName: 'Our Family',
      pin: '',
      place: '', lat: null, lon: null, units: 'fahrenheit',
      weekStart: 0,
      screensaverMin: 10,
      nightFrom: 22, nightTo: 6, nightDim: true,
      keepAwake: true,
      theme: 'auto',
      hidden: [],
      corsProxy: '',
      mealSlots: ['breakfast', 'lunch', 'dinner'],
      dietary: '',
    },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { console.warn('Could not load saved data', e); }
  return demo();
}

function migrate(s) {
  const d = demo();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.settings = Object.assign({}, d.settings, s.settings);
  return s;
}

const listeners = new Set();
export const store = {
  state: load(),
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); }
    catch (e) { console.error(e); alert('Could not save — browser storage is full.'); }
    listeners.forEach((f) => f());
  },
  update(fn) { fn(this.state); this.save(); },
  replace(next) { this.state = migrate(next); this.save(); },
  reset() { localStorage.removeItem(KEY); this.state = demo(); this.save(); },
  clearSample() {
    const s = this.state;
    Object.assign(s, { events: [], chores: [], choreLog: {}, ledger: [], meals: {}, recipes: [], sample: false });
    s.lists.forEach((l) => { l.items = []; });
    this.save();
  },
};
window.addEventListener('storage', (e) => { if (e.key === KEY) { store.state = load(); listeners.forEach((f) => f()); } });

// ---------- members ----------
export const member = (id) => store.state.members.find((m) => m.id === id);
export const visibleMembers = () => store.state.members.filter((m) => !store.state.settings.hidden.includes(m.id));
export const colorOf = (ids) => { const m = ids && ids.length ? member(ids[0]) : null; return m ? m.color : FAMILY_COLOR; };

// ---------- recurrence ----------
export const REPEATS = { none: 'Does not repeat', daily: 'Every day', weekdays: 'Every weekday (Mon–Fri)', weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month', yearly: 'Every year' };

/** All occurrences of one event overlapping [from, to). */
export function occurrences(ev, from, to) {
  const start = parseLocal(ev.start);
  const end = ev.end ? parseLocal(ev.end) : new Date(start.getTime() + (ev.allDay ? DAY_MS : 3600000));
  const dur = Math.max(0, end - start);
  const out = [];
  if (isNaN(start)) return out;
  const ex = new Set(ev.exdates || []);
  const until = ev.repeatUntil ? addDays(parseYmd(ev.repeatUntil), 1) : null;
  const push = (s) => {
    const e = new Date(s.getTime() + dur);
    if ((e > from || (dur === 0 && s >= from)) && s < to && !ex.has(ymd(s))) out.push({ ev, start: s, end: e, key: ev.id + '|' + ymd(s) });
  };
  const rep = ev.repeat || 'none';
  if (rep === 'none') { push(start); return out; }

  const stepDays = { daily: 1, weekdays: 1, weekly: 7, biweekly: 14 }[rep];
  if (stepDays) {
    let n = Math.max(0, Math.floor((from - start - dur) / (stepDays * DAY_MS)) - 1);
    for (let i = 0; i < 1500; i++, n++) {
      const s = addDays(start, n * stepDays);
      if (s >= to || (until && s >= until)) break;
      if (rep === 'weekdays' && (s.getDay() === 0 || s.getDay() === 6)) continue;
      push(s);
    }
    return out;
  }
  const stepMonths = rep === 'yearly' ? 12 : 1;
  const monthsApart = (from.getFullYear() - start.getFullYear()) * 12 + from.getMonth() - start.getMonth();
  let n = Math.max(0, Math.floor(monthsApart / stepMonths) - 1);
  for (let i = 0; i < 400; i++, n++) {
    const s = new Date(start.getFullYear(), start.getMonth() + n * stepMonths, start.getDate(), start.getHours(), start.getMinutes());
    if (s >= to || (until && s >= until)) break;
    if (s.getDate() !== start.getDate()) continue; // e.g. the 31st in a short month
    push(s);
  }
  return out;
}

/** Every visible occurrence (own events + calendar feeds) in [from, to), sorted. */
export function occurrencesIn(from, to, { includeHidden = false } = {}) {
  const s = store.state;
  const hidden = includeHidden ? [] : s.settings.hidden;
  const out = [];
  const all = s.events.concat(...Object.values(s.feedEvents || {}));
  for (const ev of all) {
    if (hidden.length && ev.memberIds && ev.memberIds.length && ev.memberIds.every((id) => hidden.includes(id))) continue;
    out.push(...occurrences(ev, from, to));
  }
  return out.sort((a, b) => (b.ev.allDay - a.ev.allDay) || (a.start - b.start) || a.ev.title.localeCompare(b.ev.title));
}

export function occurrencesOnDay(day) {
  const d0 = startOfDay(day);
  return occurrencesIn(d0, addDays(d0, 1));
}

/** Keys of occurrences that overlap another timed occurrence for the same person. */
export function conflicts(list) {
  const bad = new Set();
  const timed = list.filter((o) => !o.ev.allDay);
  for (let i = 0; i < timed.length; i++) for (let j = i + 1; j < timed.length; j++) {
    const a = timed[i], b = timed[j];
    if (a.start < b.end && b.start < a.end) {
      const shared = (a.ev.memberIds || []).some((id) => (b.ev.memberIds || []).includes(id));
      if (shared) { bad.add(a.key); bad.add(b.key); }
    }
  }
  return bad;
}

// ---------- chores & stars ----------
export const ROUTINES = { morning: ['Morning', '☀️'], afternoon: ['After school', '🎒'], evening: ['Evening', '🌙'], anytime: ['Anytime', '⭐'] };
export const choresFor = (memberId, day) => store.state.chores.filter((c) => c.memberIds.includes(memberId) && c.days.includes(day.getDay()));
export const isDone = (choreId, memberId, day) => !!(store.state.choreLog[ymd(day)] || {})[choreId + ':' + memberId];
export const stars = (memberId) => store.state.ledger.filter((l) => l.memberId === memberId).reduce((a, l) => a + l.delta, 0);

export function toggleChore(chore, memberId, day) {
  store.update((s) => {
    const k = ymd(day);
    const log = s.choreLog[k] || (s.choreLog[k] = {});
    const key = chore.id + ':' + memberId;
    const ref = `chore:${k}:${key}`;
    if (log[key]) {
      delete log[key];
      s.ledger = s.ledger.filter((l) => l.ref !== ref);
    } else {
      log[key] = Date.now();
      if (chore.stars) s.ledger.push({ id: uid(), memberId, delta: chore.stars, reason: chore.title, date: Date.now(), ref });
    }
    // keep the log small: drop entries older than 120 days
    const cutoff = ymd(addDays(new Date(), -120));
    for (const day of Object.keys(s.choreLog)) if (day < cutoff) delete s.choreLog[day];
  });
}

// ---------- meals ----------
export const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
export const mealOn = (day, slot) => ((store.state.meals[ymd(day)] || {})[slot]) || null;

export function addToGroceries(items) {
  const s = store.state;
  let list = s.lists.find((l) => l.kind === 'shopping');
  if (!list) { list = { id: uid(), name: 'Groceries', kind: 'shopping', items: [] }; s.lists.unshift(list); }
  const have = new Set(list.items.filter((i) => !i.done).map((i) => i.text.trim().toLowerCase()));
  let added = 0;
  for (const raw of items) {
    const t = String(raw).trim();
    if (t && !have.has(t.toLowerCase())) { list.items.push({ id: uid(), text: t, done: false }); have.add(t.toLowerCase()); added++; }
  }
  store.save();
  return added;
}
