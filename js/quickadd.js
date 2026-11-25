// Natural-language quick add: "Soccer Tue 5-6pm @Kiddo every week"
import { escRe, addDays, startOfDay, toLocal, DAYS } from './util.js';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYRE = '(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|urday|sday)?';

function dayIndex(word) { return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(word.slice(0, 3).toLowerCase()); }

function toMinutes(h, m, ap, fallbackAp) {
  h = +h; m = +(m || 0);
  ap = (ap || fallbackAp || '').toLowerCase();
  if (ap.startsWith('p') && h < 12) h += 12;
  if (ap.startsWith('a') && h === 12) h = 0;
  if (!ap && h >= 1 && h <= 6) h += 12; // "soccer at 5" means 5pm
  return h * 60 + m;
}

export function parseQuick(text, members, now = new Date()) {
  let t = ' ' + text.trim() + ' ';
  const out = { title: '', memberIds: [], allDay: true, repeat: 'none', start: null, end: null };
  const take = (re) => { const m = t.match(re); if (m) t = t.replace(re, ' '); return m; };

  for (const m of members) {
    const re = new RegExp(`(?:\\s|^)@?${escRe(m.name)}(?=[\\s,.!?]|$)`, 'i');
    if (re.test(t)) { out.memberIds.push(m.id); t = t.replace(re, ' '); }
  }
  t = t.replace(/\s(with|for)\s+(?=\s)/gi, ' ').replace(/\s(and|&)\s+(?=\s)/gi, ' ');

  let day = null;
  let m;
  if ((m = take(/\severy\s?day\s|\sdaily\s/i))) out.repeat = 'daily';
  else if ((m = take(/\severy\s+week\s?day\s|\sweekdays\s/i))) out.repeat = 'weekdays';
  else if ((m = take(/\s(every other week|biweekly|every 2 weeks)\s/i))) out.repeat = 'biweekly';
  else if ((m = take(new RegExp(`\\severy\\s+${DAYRE}\\s`, 'i')))) { out.repeat = 'weekly'; const di = dayIndex(m[1]); day = addDays(startOfDay(now), (di - now.getDay() + 7) % 7); }
  else if ((m = take(/\s(every week|weekly)\s/i))) out.repeat = 'weekly';
  else if ((m = take(/\s(every month|monthly)\s/i))) out.repeat = 'monthly';
  else if ((m = take(/\s(every year|yearly|annually)\s/i))) out.repeat = 'yearly';

  let tonight = false;
  if (!day) {
    if ((m = take(/\s(today)\s/i))) day = startOfDay(now);
    else if ((m = take(/\s(tonight)\s/i))) { day = startOfDay(now); tonight = true; }
    else if ((m = take(/\s(tomorrow|tmrw|tmr)\s/i))) day = addDays(startOfDay(now), 1);
    else if ((m = take(new RegExp(`\\s(?:on\\s+)?(next\\s+)?${DAYRE}\\s`, 'i')))) {
      const di = dayIndex(m[2]);
      let diff = (di - now.getDay() + 7) % 7;
      if (m[1] && diff === 0) diff = 7;
      day = addDays(startOfDay(now), diff);
    } else if ((m = take(/\s(?:on\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s/))) {
      let y = m[3] ? +m[3] : now.getFullYear(); if (y < 100) y += 2000;
      day = new Date(y, +m[1] - 1, +m[2]);
      if (!m[3] && day < startOfDay(now)) day.setFullYear(y + 1);
    } else if ((m = take(/\s(?:on\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s/i))) {
      const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
      day = new Date(now.getFullYear(), mo, +m[2]);
      if (day < startOfDay(now)) day.setFullYear(now.getFullYear() + 1);
    }
  }

  let startMin = null, endMin = null;
  const T = '(\\d{1,2})(?::(\\d{2}))?\\s?(am|pm|a|p)?';
  if ((m = take(new RegExp(`\\s(?:from\\s+|at\\s+|@\\s*)?${T}\\s?(?:-|–|to|until)\\s?${T}\\s`, 'i')))) {
    endMin = toMinutes(m[4], m[5], m[6]);
    startMin = toMinutes(m[1], m[2], m[3], m[6]);
    if (startMin > endMin && !m[3]) startMin -= 12 * 60;
  } else if ((m = take(/\s(?:at\s+)?(noon|midday)\s/i))) startMin = 720;
  else if ((m = take(/\s(?:at\s+)?midnight\s/i))) startMin = 0;
  else if ((m = take(new RegExp(`\\s(?:at\\s+|@\\s*)?(\\d{1,2})(?::(\\d{2}))?\\s?(am|pm|a|p)\\s`, 'i')))) startMin = toMinutes(m[1], m[2], m[3]);
  else if ((m = take(/\s(?:at\s+|@\s*)?(\d{1,2}):(\d{2})\s/))) startMin = toMinutes(m[1], m[2]);
  else if ((m = take(/\sat\s+(\d{1,2})\s/))) startMin = toMinutes(m[1], 0);
  if (startMin === null && tonight) startMin = 19 * 60;

  if ((m = take(/\sfor\s+(\d+(?:\.\d+)?)\s?(h|hr|hrs|hour|hours|m|min|mins|minutes)\s/i))) {
    const mins = /^h/i.test(m[2]) ? Math.round(+m[1] * 60) : Math.round(+m[1]);
    if (startMin !== null) endMin = startMin + mins;
  }

  day = day || startOfDay(now);
  if (startMin !== null) {
    out.allDay = false;
    const s = new Date(day); s.setHours(0, startMin);
    const e = new Date(day); e.setHours(0, endMin !== null ? endMin : startMin + 60);
    out.start = toLocal(s); out.end = toLocal(e);
  } else {
    out.start = toLocal(day); out.end = toLocal(addDays(day, 1));
  }
  out.title = t.replace(/\s(at|on|from|@)\s*$/i, ' ').replace(/^\s*(at|on)\s/i, ' ').replace(/\s+/g, ' ').trim();
  out.title = out.title.charAt(0).toUpperCase() + out.title.slice(1);
  out.dayName = DAYS[day.getDay()];
  return out;
}
