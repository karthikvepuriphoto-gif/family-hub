// Shared lists: groceries, to-dos, packing lists… with optional assignee.
import { store, member } from '../store.js';
import { esc, uid } from '../util.js';
import { avatar, confirmBox, openModal } from '../ui.js';

let current = null;

export function render(root) {
  const s = store.state;
  if (!s.lists.find((l) => l.id === current)) current = s.lists[0] && s.lists[0].id;
  const list = s.lists.find((l) => l.id === current);
  const open = list ? list.items.filter((i) => !i.done) : [];
  const done = list ? list.items.filter((i) => i.done) : [];
  root.innerHTML = `<div class="lists">
    <nav class="list-tabs">${s.lists.map((l) => `<button class="${l.id === current ? 'on' : ''}" data-list="${l.id}">${l.kind === 'shopping' ? '🛒' : '✅'} ${esc(l.name)}<span class="pill">${l.items.filter((i) => !i.done).length}</span></button>`).join('')}
      <button class="ghost" data-newlist>＋ New list</button></nav>
    ${list ? `<section class="card list-card">
      <div class="card-h"><h2>${esc(list.name)}</h2><button class="icon-btn" data-rename aria-label="List settings">⋯</button></div>
      <form class="additem" id="additem"><input name="t" placeholder="Add an item…" autocomplete="off" enterkeyhint="done">
        ${list.kind === 'todo' ? `<select name="who"><option value="">Anyone</option>${s.members.map((m) => `<option value="${m.id}">${esc(m.emoji)} ${esc(m.name)}</option>`).join('')}</select>` : ''}
        <button class="btn primary">Add</button></form>
      <ul class="items">${open.map(item).join('') || '<li class="empty">All clear! ✨</li>'}</ul>
      ${done.length ? `<details class="done-items" ${done.length < 6 ? 'open' : ''}><summary>${done.length} checked off <button class="btn small ghost" data-clear>Clear</button></summary><ul class="items">${done.map(item).join('')}</ul></details>` : ''}
    </section>` : '<p class="empty">Create a list to get started.</p>'}
  </div>`;

  root.onclick = async (e) => {
    const t = e.target;
    const l = t.closest('[data-list]'); if (l) { current = l.dataset.list; return render(root); }
    if (t.closest('[data-newlist]')) return editList({});
    if (t.closest('[data-rename]')) return editList(list);
    if (t.closest('[data-clear]')) { e.preventDefault(); store.update(() => { list.items = list.items.filter((i) => !i.done); }); return; }
    const x = t.closest('[data-del]'); if (x) { store.update(() => { list.items = list.items.filter((i) => i.id !== x.dataset.del); }); return; }
    const it = t.closest('[data-item]'); if (it) { store.update(() => { const i = list.items.find((y) => y.id === it.dataset.item); i.done = !i.done; }); }
  };
  const f = root.querySelector('#additem');
  if (f) f.onsubmit = (e) => {
    e.preventDefault();
    const parts = f.t.value.split(/,|\n/).map((x) => x.trim()).filter(Boolean);
    if (!parts.length) return;
    const who = f.who ? f.who.value : '';
    store.update(() => { parts.forEach((p) => list.items.push({ id: uid(), text: p, done: false, memberId: who || undefined })); });
    const again = root.querySelector('#additem input');
    if (again) again.focus();
  };
}

const item = (i) => `<li class="item ${i.done ? 'done' : ''}"><button class="item-main" data-item="${i.id}"><span class="box">${i.done ? '✓' : ''}</span><span>${esc(i.text)}</span>${i.memberId && member(i.memberId) ? avatar(member(i.memberId), 'xs') : ''}</button><button class="icon-btn x" data-del="${i.id}" aria-label="Remove">✕</button></li>`;

function editList(l) {
  const isNew = !l.id;
  const m = openModal(`<form class="form"><h2>${isNew ? 'New list' : 'List settings'}</h2>
    <input name="name" placeholder="List name" value="${esc(l.name || '')}" required autofocus>
    <label>Type<select name="kind"><option value="todo" ${l.kind === 'todo' ? 'selected' : ''}>✅ To-do (can assign people)</option><option value="shopping" ${l.kind === 'shopping' ? 'selected' : ''}>🛒 Shopping</option></select></label>
    <div class="row between">${isNew ? '<span></span>' : '<button type="button" class="btn ghost danger" data-del>Delete list</button>'}
    <div class="row"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div></div></form>`);
  const f = m.querySelector('form');
  f.onsubmit = (e) => {
    e.preventDefault();
    store.update((s) => {
      if (isNew) { const n = { id: uid(), name: f.name.value.trim(), kind: f.kind.value, items: [] }; s.lists.push(n); current = n.id; }
      else { const x = s.lists.find((y) => y.id === l.id); x.name = f.name.value.trim(); x.kind = f.kind.value; }
    });
    m.close();
  };
  const d = m.querySelector('[data-del]');
  if (d) d.onclick = async () => { if (await confirmBox(`Delete the list “${l.name}” and all its items?`, 'Delete', true)) { store.update((s) => { s.lists = s.lists.filter((y) => y.id !== l.id); }); m.close(); } };
}
