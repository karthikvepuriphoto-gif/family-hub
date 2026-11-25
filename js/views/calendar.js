// Calendar: Day (column per person), Week, Month and Schedule views.
import { store, occurrencesIn, occurrencesOnDay, conflicts, colorOf, member, FAMILY_COLOR } from '../store.js';
import { esc, addDays, addMonths, startOfDay, startOfWeek, startOfMonth, sameDay, isToday, fmtTime, fmtDayLong, fmtDayShort, DAYS_SHORT, MONTHS, ymd } from '../util.js';
import { avatars } from '../ui.js';
import { openEvent, newEventOn } from '../editors.js';

const ui = { view: localStorage.getItem('fh.calview') || 'week', cursor: startOfDay(new Date()) };
const H0 = 6, H1 = 22; // default visible hours in day view

export function render(root) {
  const s = store.state;
  const v = ui.view;
  const title = v === 'month' ? `${MONTHS[ui.cursor.getMonth()]} ${ui.cursor.getFullYear()}`
    : v === 'week' ? weekTitle() : v === 'day' ? fmtDayLong(ui.cursor) : 'Coming up';

  root.innerHTML = `<div class="cal">
    <div class="toolbar">
      <div class="row"><button class="btn" data-nav="today">Today</button><button class="icon-btn" data-nav="-1" aria-label="Previous">‹</button><button class="icon-btn" data-nav="1" aria-label="Next">›</button><h2 class="cal-title">${esc(title)}</h2></div>
      <div class="seg">${['day', 'week', 'month', 'agenda'].map((x) => `<button class="${v === x ? 'on' : ''}" data-view="${x}">${x === 'agenda' ? 'List' : x[0].toUpperCase() + x.slice(1)}</button>`).join('')}</div>
    </div>
    <div class="filters">${s.members.map((m) => `<button class="chip ${s.settings.hidden.includes(m.id) ? '' : 'on'}" style="--c:${m.color}" data-toggle="${m.id}">${esc(m.emoji)} ${esc(m.name)}</button>`).join('')}
      <button class="btn primary small add-ev" data-new>＋ Event</button></div>
    <div class="cal-body">${v === 'day' ? dayView() : v === 'week' ? weekView() : v === 'month' ? monthView() : agendaView()}</div>
  </div>`;

  root.onclick = (e) => {
    const t = e.target;
    const nav = t.closest('[data-nav]');
    if (nav) { move(nav.dataset.nav); return render(root); }
    const vw = t.closest('[data-view]');
    if (vw) { ui.view = vw.dataset.view; localStorage.setItem('fh.calview', ui.view); return render(root); }
    const tg = t.closest('[data-toggle]');
    if (tg) { store.update((st) => { const h = st.settings.hidden; const i = h.indexOf(tg.dataset.toggle); if (i >= 0) h.splice(i, 1); else h.push(tg.dataset.toggle); }); return; }
    if (t.closest('[data-new]')) return newEventOn(ui.cursor);
    const ev = t.closest('[data-occ]');
    if (ev) { const [id, day] = ev.dataset.occ.split('|'); const o = occurrencesOnDay(new Date(day.replace(/-/g, '/'))).find((x) => x.ev.id === id); if (o) openEvent(o.ev, o.start); return; }
    const md = t.closest('[data-goday]');
    if (md) { ui.cursor = new Date(md.dataset.goday.replace(/-/g, '/')); ui.view = 'day'; return render(root); }
    const slot = t.closest('[data-slot]');
    if (slot) { const [day, hour] = slot.dataset.slot.split('@'); return newEventOn(new Date(day.replace(/-/g, '/')), hour === undefined ? undefined : +hour); }
  };

  // swipe left/right to change period
  let x0 = null;
  const body = root.querySelector('.cal-body');
  body.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  body.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 80) { move(dx < 0 ? '1' : '-1'); render(root); }
  });
  const sc = root.querySelector('.dv-scroll');
  if (sc) { const nl = root.querySelector('.now-line'); const first = root.querySelector('.dev'); sc.scrollTop = Math.max(0, (nl ? nl.offsetTop : first ? first.offsetTop : 0) - 140); }
}

function move(dir) {
  if (dir === 'today') { ui.cursor = startOfDay(new Date()); return; }
  const n = +dir;
  ui.cursor = ui.view === 'month' ? addMonths(startOfMonth(ui.cursor), n) : addDays(ui.cursor, n * (ui.view === 'day' ? 1 : ui.view === 'week' ? 7 : 14));
}

function weekTitle() {
  const a = startOfWeek(ui.cursor, store.state.settings.weekStart), b = addDays(a, 6);
  return a.getMonth() === b.getMonth() ? `${MONTHS[a.getMonth()]} ${a.getDate()} – ${b.getDate()}` : `${fmtDayShort(a).slice(4)} – ${fmtDayShort(b).slice(4)}`;
}

const evChip = (o, clash) => `<button class="ev ${o.ev.allDay ? 'allday' : ''} ${clash && clash.has(o.key) ? 'clash' : ''} ${o.ev.feedId ? 'feed' : ''}" style="--c:${colorOf(o.ev.memberIds)}" data-occ="${esc(o.ev.id + '|' + ymd(o.start))}">
  ${o.ev.allDay ? '' : `<span class="ev-time">${fmtTime(o.start)}</span>`}<span class="ev-title">${esc(o.ev.title)}</span>${o.ev.memberIds && o.ev.memberIds.length > 1 ? `<span class="ev-av">${avatars(o.ev.memberIds, 'xs')}</span>` : ''}</button>`;

function weekView() {
  const a = startOfWeek(ui.cursor, store.state.settings.weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addDays(a, i));
  return `<div class="week">${days.map((d) => {
    const occ = occurrencesOnDay(d);
    const clash = conflicts(occ);
    return `<div class="wday ${isToday(d) ? 'today' : ''}">
      <button class="wday-h" data-goday="${ymd(d)}"><span>${DAYS_SHORT[d.getDay()]}</span><b>${d.getDate()}</b></button>
      <div class="wday-body" data-slot="${ymd(d)}">${occ.map((o) => evChip(o, clash)).join('')}</div></div>`;
  }).join('')}</div>`;
}

function monthView() {
  const m0 = startOfMonth(ui.cursor);
  const g0 = startOfWeek(m0, store.state.settings.weekStart);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(g0, i));
  const occ = occurrencesIn(g0, addDays(g0, 42));
  const ws = store.state.settings.weekStart;
  return `<div class="month"><div class="mhead">${Array.from({ length: 7 }, (_, i) => `<span>${DAYS_SHORT[(i + ws) % 7]}</span>`).join('')}</div>
    <div class="mgrid">${cells.map((d) => {
      const list = occ.filter((o) => o.start < addDays(d, 1) && (o.end > d || (+o.end === +o.start && sameDay(o.start, d))));
      return `<button class="mcell ${d.getMonth() !== m0.getMonth() ? 'out' : ''} ${isToday(d) ? 'today' : ''}" data-goday="${ymd(d)}">
        <span class="mnum">${d.getDate()}</span>
        ${list.slice(0, 3).map((o) => `<span class="mev" style="--c:${colorOf(o.ev.memberIds)}">${o.ev.allDay ? '' : `<i>${fmtTime(o.start)}</i> `}${esc(o.ev.title)}</span>`).join('')}
        ${list.length > 3 ? `<span class="more">+${list.length - 3} more</span>` : ''}</button>`;
    }).join('')}</div></div>`;
}

function agendaView() {
  const from = startOfDay(ui.cursor);
  const occ = occurrencesIn(from, addDays(from, 28));
  const byDay = new Map();
  occ.forEach((o) => { const k = ymd(o.start < from ? from : o.start); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(o); });
  if (!byDay.size) return '<p class="empty">Nothing in the next four weeks.</p>';
  return `<div class="agenda-view">${Array.from(byDay.entries()).map(([k, list]) => {
    const d = new Date(k.replace(/-/g, '/'));
    return `<div class="ag-day ${isToday(d) ? 'today' : ''}"><h3>${isToday(d) ? 'Today · ' : ''}${fmtDayLong(d)}</h3>
      ${list.map((o) => `<button class="ag-row" style="--c:${colorOf(o.ev.memberIds)}" data-occ="${esc(o.ev.id + '|' + ymd(o.start))}">
        <span class="ag-time">${o.ev.allDay ? 'All day' : fmtTime(o.start) + ' – ' + fmtTime(o.end)}</span><b>${esc(o.ev.title)}</b><span class="ag-who">${avatars(o.ev.memberIds)}</span></button>`).join('')}</div>`;
  }).join('')}</div>`;
}

/** Day view: a time grid with one column per (visible) person plus “Everyone”. */
function dayView() {
  const s = store.state;
  const d = ui.cursor;
  const occ = occurrencesOnDay(d);
  const clash = conflicts(occ);
  const cols = s.members.filter((m) => !s.settings.hidden.includes(m.id)).map((m) => ({ id: m.id, name: m.name, emoji: m.emoji, color: m.color }));
  cols.push({ id: '', name: 'Everyone', emoji: '👪', color: FAMILY_COLOR });
  const allDay = occ.filter((o) => o.ev.allDay);
  const timed = occ.filter((o) => !o.ev.allDay);
  let h0 = H0, h1 = H1;
  timed.forEach((o) => { h0 = Math.min(h0, sameDay(o.start, d) ? o.start.getHours() : 0); h1 = Math.max(h1, sameDay(o.end, d) ? Math.ceil(o.end.getHours() + o.end.getMinutes() / 60) : 24); });
  const hours = Array.from({ length: h1 - h0 }, (_, i) => h0 + i);
  const PX = 64; // pixels per hour
  const dayStart = startOfDay(d);
  const top = (t) => ((Math.max(t, dayStart) - dayStart) / 3600000 - h0) * PX;

  const colHtml = (c) => {
    const mine = timed.filter((o) => (c.id ? (o.ev.memberIds || []).includes(c.id) : !(o.ev.memberIds || []).length));
    // assign overlapping events to side-by-side lanes
    const lanes = [];
    const placed = mine.map((o) => {
      let lane = lanes.findIndex((end) => end <= o.start);
      if (lane < 0) { lane = lanes.length; lanes.push(o.end); } else lanes[lane] = o.end;
      return { o, lane };
    });
    const n = Math.max(1, lanes.length);
    return `<div class="dcol">${hours.map((h) => `<div class="hslot" data-slot="${ymd(d)}@${h}"></div>`).join('')}
      ${placed.map(({ o, lane }) => {
        const t = top(o.start), b = Math.min(top(o.end), hours.length * PX);
        return `<button class="dev ${clash.has(o.key) ? 'clash' : ''}" style="--c:${colorOf(o.ev.memberIds)};top:${t}px;height:${Math.max(26, b - t - 2)}px;left:${(lane / n) * 100}%;width:${100 / n}%" data-occ="${esc(o.ev.id + '|' + ymd(o.start))}">
          <b>${esc(o.ev.title)}</b><small>${fmtTime(o.start)} – ${fmtTime(o.end)}${o.ev.location ? ' · ' + esc(o.ev.location) : ''}</small></button>`;
      }).join('')}</div>`;
  };
  const now = new Date();
  const nowTop = isToday(d) && now.getHours() >= h0 && now.getHours() < h1 ? top(now) : null;

  return `${allDay.length ? `<div class="allday-row">${allDay.map((o) => evChip(o)).join('')}</div>` : ''}
  <div class="dayview" style="--cols:${cols.length}">
    <div class="dv-head"><span></span>${cols.map((c) => `<span style="--c:${c.color}">${esc(c.emoji)} ${esc(c.name)}</span>`).join('')}</div>
    <div class="dv-scroll"><div class="dv-grid" style="height:${hours.length * PX}px">
      <div class="hours">${hours.map((h) => `<span style="height:${PX}px">${fmtTime(new Date(2000, 0, 1, h))}</span>`).join('')}</div>
      ${cols.map(colHtml).join('')}
      ${nowTop !== null ? `<div class="now-line" style="top:${nowTop}px"></div>` : ''}
    </div></div></div>`;
}

export { member };
