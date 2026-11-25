// Rewards: star balances, a reward shop, bonus stars and history.
import { store, stars, member } from '../store.js';
import { esc, uid } from '../util.js';
import { avatar, openModal, requirePin, confirmBox, toast, celebrate, choiceBox } from '../ui.js';

export function render(root) {
  const s = store.state;
  const kids = s.members.filter((m) => m.kid).length ? s.members.filter((m) => m.kid) : s.members;
  const hist = s.ledger.slice(-25).reverse();
  root.innerHTML = `<div class="toolbar"><h2>Rewards</h2><div class="row"><button class="btn" data-bonus>➕ Bonus stars</button><button class="btn" data-manage>⚙️ Edit rewards</button></div></div>
    <div class="balances">${kids.map((m) => `<div class="bal" style="--c:${m.color}">${avatar(m, 'lg')}<b>${esc(m.name)}</b><span class="big">⭐ ${stars(m.id)}</span></div>`).join('')}</div>
    <h3 class="section-h">Reward shop</h3>
    <div class="shop">${s.rewards.map((r) => `<button class="reward" data-redeem="${r.id}"><span class="rw-e">${esc(r.emoji)}</span><b>${esc(r.title)}</b><span class="pill">⭐ ${r.cost}</span></button>`).join('') || '<p class="empty">Add a few rewards for the kids to work toward.</p>'}</div>
    <h3 class="section-h">Recent activity</h3>
    <ul class="history">${hist.map((l) => { const m = member(l.memberId); return `<li>${avatar(m, 'xs')} <span>${esc(m ? m.name : '?')} · ${esc(l.reason)}</span><b class="${l.delta < 0 ? 'neg' : 'pos'}">${l.delta > 0 ? '+' : ''}${l.delta}</b><small class="muted">${new Date(l.date).toLocaleDateString()}</small></li>`; }).join('') || '<li class="muted">No stars earned yet.</li>'}</ul>`;

  root.onclick = async (e) => {
    const r = e.target.closest('[data-redeem]');
    if (r) return redeem(s.rewards.find((x) => x.id === r.dataset.redeem), kids);
    if (e.target.closest('[data-manage]')) { if (await requirePin('Edit rewards')) manage(); return; }
    if (e.target.closest('[data-bonus]')) { if (await requirePin('Give bonus stars')) bonus(); }
  };
}

async function redeem(r, kids) {
  const who = await choiceBox(`Who is redeeming “${r.title}” (⭐ ${r.cost})?`, kids.map((m) => ({ label: `${m.emoji} ${m.name} — has ⭐ ${stars(m.id)}`, value: m.id })));
  if (!who) return;
  const m = member(who);
  if (stars(who) < r.cost) { toast(`${m.name} needs ${r.cost - stars(who)} more stars`); return; }
  if (!(await requirePin('Approve reward'))) return;
  store.update((s) => s.ledger.push({ id: uid(), memberId: who, delta: -r.cost, reason: `${r.emoji} ${r.title}`, date: Date.now(), ref: 'reward' }));
  celebrate(window.innerWidth / 2, window.innerHeight / 2, '🎉');
  toast(`Enjoy, ${m.name}!`);
}

function bonus() {
  const s = store.state;
  const m = openModal(`<form class="form"><h2>Bonus stars</h2>
    <label>Who<select name="who">${s.members.map((x) => `<option value="${x.id}">${esc(x.emoji)} ${esc(x.name)}</option>`).join('')}</select></label>
    <label>Stars (use a negative number to take away)<input type="number" name="n" value="5"></label>
    <input name="why" placeholder="Why? e.g. Helped a neighbor" value="Bonus">
    <div class="row end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Give</button></div></form>`);
  m.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target; const n = Math.round(+f.n.value || 0);
    if (n) store.update((st) => st.ledger.push({ id: uid(), memberId: f.who.value, delta: n, reason: f.why.value.trim() || 'Bonus', date: Date.now(), ref: 'bonus' }));
    m.close();
  };
}

function manage() {
  const draw = () => `<h2>Rewards</h2><div class="manage-list">${store.state.rewards.map((r) => `<div class="mrow edit-row" data-id="${r.id}">
      <input class="emoji-in" value="${esc(r.emoji)}" data-f="emoji"><input value="${esc(r.title)}" data-f="title"><input type="number" min="1" value="${r.cost}" data-f="cost" class="num"><button class="icon-btn" data-del="${r.id}" aria-label="Delete">🗑️</button></div>`).join('')}</div>
    <div class="row between"><button class="btn" data-add>＋ Add reward</button><button class="btn primary" data-close>Done</button></div>`;
  const m = openModal(draw(), { wide: true });
  m.addEventListener('change', (e) => {
    const row = e.target.closest('[data-id]'); if (!row) return;
    store.update((s) => { const r = s.rewards.find((x) => x.id === row.dataset.id); const k = e.target.dataset.f; r[k] = k === 'cost' ? Math.max(1, +e.target.value || 1) : e.target.value; });
  });
  m.addEventListener('click', async (e) => {
    if (e.target.closest('[data-add]')) { store.update((s) => s.rewards.push({ id: uid(), emoji: '🎁', title: 'New reward', cost: 10 })); m.innerHTML = draw(); }
    const d = e.target.closest('[data-del]');
    if (d && (await confirmBox('Delete this reward?', 'Delete', true))) { store.update((s) => { s.rewards = s.rewards.filter((x) => x.id !== d.dataset.del); }); m.innerHTML = draw(); }
  });
}
