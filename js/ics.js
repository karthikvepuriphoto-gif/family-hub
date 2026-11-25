// Minimal iCalendar (.ics) reader: enough for Google, iCloud and Outlook exports/feeds.
import { uid, ymd, toLocal, addDays, DAY_MS } from './util.js';

const unescapeText = (s) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

function icsDate(prop) {
  if (!prop) return null;
  const v = prop.val.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mi, ss, z] = m;
  if (hh === undefined) return { date: new Date(+y, +mo - 1, +d), allDay: true };
  // UTC times convert to local; TZID times are treated as local wall-clock time.
  const date = z ? new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mi, +(ss || 0))) : new Date(+y, +mo - 1, +d, +hh, +mi, +(ss || 0));
  return { date, allDay: false };
}

function parseRRule(val) {
  const r = {};
  val.split(';').forEach((p) => { const [k, v] = p.split('='); if (k) r[k.toUpperCase()] = v; });
  return r;
}

const BYDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

export function parseICS(text, extra = {}) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const raw = [];
  let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur) raw.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const [name, ...params] = line.slice(0, i).split(';');
    const prop = { val: line.slice(i + 1), params: Object.fromEntries(params.map((p) => p.split('='))) };
    const key = name.toUpperCase();
    if (key === 'EXDATE') (cur.EXDATE = cur.EXDATE || []).push(prop);
    else cur[key] = prop;
  }

  const events = [];
  const overrides = [];
  for (const r of raw) {
    if (r.STATUS && r.STATUS.val === 'CANCELLED') continue;
    const s = icsDate(r.DTSTART);
    if (!s) continue;
    let e = icsDate(r.DTEND);
    const endDate = e ? e.date : new Date(s.date.getTime() + (s.allDay ? DAY_MS : 3600000));
    const ev = Object.assign({
      id: uid(),
      title: r.SUMMARY ? unescapeText(r.SUMMARY.val) : '(No title)',
      start: toLocal(s.date),
      end: toLocal(endDate),
      allDay: s.allDay,
      location: r.LOCATION ? unescapeText(r.LOCATION.val) : '',
      notes: r.DESCRIPTION ? unescapeText(r.DESCRIPTION.val).slice(0, 500) : '',
      repeat: 'none',
      exdates: (r.EXDATE || []).flatMap((p) => p.val.split(',').map((v) => icsDate({ val: v }))).filter(Boolean).map((x) => ymd(x.date)),
      uidRef: r.UID ? r.UID.val : '',
    }, extra);

    if (r['RECURRENCE-ID']) {
      const rid = icsDate(r['RECURRENCE-ID']);
      if (rid) overrides.push({ uidRef: ev.uidRef, day: ymd(rid.date) });
      events.push(ev);
      continue;
    }

    if (r.RRULE) {
      const rr = parseRRule(r.RRULE.val);
      const interval = +(rr.INTERVAL || 1);
      const days = (rr.BYDAY || '').split(',').map((d) => BYDAY[d.slice(-2)]).filter((d) => d !== undefined);
      if (rr.UNTIL) { const u = icsDate({ val: rr.UNTIL }); if (u) ev.repeatUntil = ymd(u.date); }
      if (rr.FREQ === 'DAILY' && interval === 1) ev.repeat = 'daily';
      else if (rr.FREQ === 'WEEKLY' && interval <= 2) {
        const weekdays = days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d));
        if (weekdays && interval === 1) ev.repeat = 'weekdays';
        else {
          ev.repeat = interval === 2 ? 'biweekly' : 'weekly';
          if (days.length > 1) {
            // one event per weekday listed, e.g. BYDAY=MO,WE
            const base = s.date;
            for (const d of days) {
              const shift = (d - base.getDay() + 7) % 7;
              const copy = Object.assign({}, ev, { id: uid(), start: toLocal(addDays(base, shift)), end: toLocal(addDays(endDate, shift)) });
              if (rr.COUNT) copy.repeatUntil = ymd(addDays(base, Math.ceil(+rr.COUNT / days.length) * 7 * interval));
              events.push(copy);
            }
            continue;
          }
        }
      } else if (rr.FREQ === 'MONTHLY' && interval === 1 && !rr.BYDAY) ev.repeat = 'monthly';
      else if (rr.FREQ === 'YEARLY' && interval === 1) ev.repeat = 'yearly';
      if (rr.COUNT && !ev.repeatUntil) {
        const per = { daily: 1, weekdays: 1.4, weekly: 7, biweekly: 14, monthly: 30.5, yearly: 365.25 }[ev.repeat] || 1;
        ev.repeatUntil = ymd(addDays(s.date, Math.ceil((+rr.COUNT - 1) * per)));
      }
    }
    events.push(ev);
  }

  // A modified single instance replaces that day of its series.
  for (const o of overrides) {
    for (const ev of events) if (ev.uidRef === o.uidRef && ev.repeat !== 'none' && !(ev.exdates || []).includes(o.day)) ev.exdates.push(o.day);
  }
  return events;
}
