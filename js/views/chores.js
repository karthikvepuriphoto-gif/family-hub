// Chore chart: one column per person, grouped by routine, tap to complete and earn stars.
import { store, visibleMembers, choresFor, isDone, toggleChore, stars, ROUTINES, member } from '../store.js';
import { esc, uid, addDays, startOfDay, isToday, fmtDayLong, DAYS_SHORT } from '../util.js';
import { avatar, openModal, memberPicker, wirePicker, pickerValue, requirePin, confirmBox, celebrate } from '../ui.js';

let day = startOfDay(new Date());

export function render(root) {
  const ms = visibleMembers().filter((m) => store.state.chores.some((c) => c.memberIds.includes(m.id)));
  root.innerHTML = `<div class="toolbar">
      <div class="row"><button class="icon-btn" data-nav="-1">‹</button><h2>${isToday(day) ? 'Today' : fmtDayLong(day)}</h2><button class="icon-btn" data-nav="1" ${isToday(day) ? 'disabled' : ''}>›</button>${isToday(day) ? '' : '<button class="btn small" data-nav="0">Back to today</button>'}</div>
      <button class="btn" data-manage>⚙️ Manage chores</button>
    </div>
    ${ms.length ? `<div class="chore-board" style="--n:${ms.length}">${ms.map((m) => column(m)).join('')}</div>` : '<p class="empty">No chores yet. Tap “Manage chores” to add some.</p>'}`;

  root.onclick = async (e) => {
    const n = e.target.closest('[data-nav]');
    if (n) { day = n.dataset.nav === '0' ? startOfDay(new Date()) : addDays(day, +n.dataset.nav); if (day > new Date()) day = startOfDay(new Date()); return render(root); }
    if (e.target.closest('[data-manage]')) { if (await requirePin('Manage chores')) manage(); return; }
    const t = e.target.closest('[data-chore]');
    if (t) {
      const c = store.state.chores.find((x) => x.id === t.dataset.chore);
      const was = isDone(c.id, t.dataset.m, day);
      if (!was) { const r = t.getBoundingClientRect(); celebrate(r.left + r.width / 2, r.top + r.height / 2, c.emoji || '⭐'); }
      toggleChore(c, t.dataset.m, day);
    }
  };
}

function column(m) {
  const list = choresFor(m.id, day);
  const done = list.filter((c) => isDone(c.id, m.id, day)).length;
  const groups = groupChores(list);
  return `<section class="chore-col" style="--c:${m.color}">
    <header>${avatar(m, 'lg')}<div><b>${esc(m.name)}</b><span class="small">⭐ ${stars(m.id)} stars</span></div>
      <div class="ring sm" style="--p:${list.length ? Math.round((done / list.length) * 100) : 0};--c:${m.color}"><span>${done}/${list.length}</span></div></header>
    ${list.length && done === list.length ? '<div class="alldone">🎉 All done!</div>' : ''}
    ${groups.map(([label, l]) => `<h4 class="chore-area">${esc(label)}</h4>
      ${l.map((c) => { const d = isDone(c.id, m.id, day); return `<button class="chore ${d ? 'done' : ''}" data-chore="${c.id}" data-m="${m.id}">
        <span class="chore-e">${esc(c.emoji || '✔️')}</span><span class="chore-t">${esc(c.title)}</span><span class="chore-s">${c.stars ? '⭐'.repeat(Math.min(c.stars, 3)) + (c.stars > 3 ? '+' : '') : ''}</span><span class="check">${d ? '✓' : ''}</span></button>`; }).join('')}`).join('') || '<p class="empty small">Free day!</p>'}
  </section>`;
}

const AREA_ORDER = ['Personal care', 'Cleanup'];

function areaOptions() {
  const seen = new Set(AREA_ORDER.map((a) => a.toLowerCase()));
  const out = AREA_ORDER.slice();
  for (const c of store.state.chores) {
    const a = (c.area || '').trim();
    if (a && !seen.has(a.toLowerCase())) { seen.add(a.toLowerCase()); out.push(a); }
  }
  return out;
}

function groupChores(list) {
  const labelOf = (c) => {
    const area = (c.area || '').trim();
    if (area) return area;
    const r = ROUTINES[c.routine];
    return r ? `${r[1]} ${r[0]}` : 'Anytime';
  };
  const labels = [];
  const seen = new Set();
  for (const c of list) {
    const lab = labelOf(c);
    if (!seen.has(lab)) { seen.add(lab); labels.push(lab); }
  }
  labels.sort((a, b) => {
    const ia = AREA_ORDER.indexOf(a), ib = AREA_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b);
  });
  return labels.map((lab) => [lab, list.filter((c) => labelOf(c) === lab)]);
}

function manage() {
  const draw = () => {
    const cs = store.state.chores;
    return `<h2>Chores</h2><div class="manage-list">${cs.map((c) => `<button class="mrow" data-edit="${c.id}"><span>${esc(c.emoji)}</span><b>${esc(c.title)}</b>
      <span class="muted small">${c.area ? esc(c.area) + ' · ' : ''}${ROUTINES[c.routine][0]} · ${c.days.length === 7 ? 'Daily' : c.days.map((d) => DAYS_SHORT[d]).join(' ')} · ⭐${c.stars}</span>
      <span class="avs">${c.memberIds.map((id) => avatar(member(id), 'xs')).join('')}</span></button>`).join('') || '<p class="empty">No chores yet.</p>'}</div>
      <div class="row between"><button class="btn primary" data-add>＋ Add chore</button><button class="btn ghost" data-close>Done</button></div>`;
  };
  const m = openModal(draw(), { wide: true });
  const refresh = () => { m.innerHTML = draw(); };
  m.onclick = (e) => {
    if (e.target.closest('[data-add]')) editChore({}, refresh);
    const ed = e.target.closest('[data-edit]');
    if (ed) editChore(store.state.chores.find((c) => c.id === ed.dataset.edit), refresh);
  };
}

const CHORE_EMOJI = ['🛏️', '🪥', '🎒', '📚', '🍽️', '🗑️', '🧺', '🐶', '🌱', '🧹', '🧸', '🎹', '🏃', '🛁', '🥛', '🚿', '🧴', '💨'];

function editChore(c, done) {
  const isNew = !c.id;
  c = Object.assign({ title: '', emoji: '⭐', memberIds: [], area: '', routine: 'anytime', days: [0, 1, 2, 3, 4, 5, 6], stars: 1 }, c);
  const m = openModal(`<form class="form"><h2>${isNew ? 'New chore' : 'Edit chore'}</h2>
    <div class="row"><input name="emoji" class="emoji-in" value="${esc(c.emoji)}" maxlength="4"><input name="title" placeholder="Chore name" value="${esc(c.title)}" required autofocus></div>
    <div class="emoji-row">${CHORE_EMOJI.map((x) => `<button type="button" data-e="${x}">${x}</button>`).join('')}</div>
    <label>Who does it</label>${memberPicker(c.memberIds)}
    <label>Area / group<input name="area" placeholder="Pick an existing area or type a new one" value="${esc(c.area || '')}" list="chore-areas"></label>
    <datalist id="chore-areas">${areaOptions().map((a) => `<option value="${esc(a)}">`).join('')}</datalist>
    <label>When<select name="routine">${Object.entries(ROUTINES).map(([k, v]) => `<option value="${k}" ${c.routine === k ? 'selected' : ''}>${v[1]} ${v[0]}</option>`).join('')}</select></label>
    <label>Days</label><div class="days">${DAYS_SHORT.map((d, i) => `<label class="day"><input type="checkbox" name="d" value="${i}" ${c.days.includes(i) ? 'checked' : ''}><span>${d[0]}</span></label>`).join('')}</div>
    <label>Stars earned<input type="number" name="stars" min="0" max="50" value="${c.stars}"></label>
    <div class="row between">${isNew ? '<span></span>' : '<button type="button" class="btn ghost danger" data-del>Delete</button>'}
      <div class="row"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div></div></form>`);
  wirePicker(m);
  const f = m.querySelector('form');
  m.querySelector('.emoji-row').onclick = (e) => { const b = e.target.closest('[data-e]'); if (b) f.emoji.value = b.dataset.e; };
  f.onsubmit = (e) => {
    e.preventDefault();
    const memberIds = pickerValue(m, 'members');
    if (!memberIds.length) { alert('Pick at least one person.'); return; }
    const data = { title: f.title.value.trim(), emoji: f.emoji.value.trim() || '⭐', memberIds, area: f.area.value.trim(), routine: f.routine.value, days: Array.from(f.querySelectorAll('[name=d]:checked')).map((x) => +x.value), stars: Math.max(0, +f.stars.value || 0) };
    store.update((s) => { if (isNew) s.chores.push(Object.assign({ id: uid() }, data)); else Object.assign(s.chores.find((x) => x.id === c.id), data); });
    m.close(); done();
  };
  const del = m.querySelector('[data-del]');
  if (del) del.onclick = async () => { if (await confirmBox(`Delete “${c.title}”?`, 'Delete', true)) { store.update((s) => { s.chores = s.chores.filter((x) => x.id !== c.id); }); m.close(); done(); } };
}
