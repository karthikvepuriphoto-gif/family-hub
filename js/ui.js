// Shared UI pieces: modal sheets, PIN pad, toasts, avatars.
import { esc } from './util.js';
import { store, member, FAMILY_COLOR } from './store.js';

export function avatar(m, size = 'md') {
  if (!m) return `<span class="av av-${size}" style="--c:${FAMILY_COLOR}" title="Family">👪</span>`;
  return `<span class="av av-${size}" style="--c:${m.color}" title="${esc(m.name)}">${esc(m.emoji || m.name[0])}</span>`;
}
export const avatars = (ids, size = 'sm') => (ids && ids.length ? ids.map((id) => avatar(member(id), size)).join('') : avatar(null, size));

export function memberPicker(selected, { multi = true, includeNone = false, name = 'members' } = {}) {
  const ms = store.state.members;
  return `<div class="picker" data-picker="${name}" data-multi="${multi}">
    ${includeNone ? `<button type="button" class="chip ${!selected.length ? 'on' : ''}" data-id="" style="--c:${FAMILY_COLOR}">👪 Everyone</button>` : ''}
    ${ms.map((m) => `<button type="button" class="chip ${selected.includes(m.id) ? 'on' : ''}" data-id="${m.id}" style="--c:${m.color}">${esc(m.emoji)} ${esc(m.name)}</button>`).join('')}
  </div>`;
}
export function wirePicker(root) {
  root.querySelectorAll('[data-picker]').forEach((p) => {
    p.addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      const multi = p.dataset.multi === 'true';
      if (!b.dataset.id) { p.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b)); return; }
      const none = p.querySelector('.chip[data-id=""]'); if (none) none.classList.remove('on');
      if (multi) b.classList.toggle('on');
      else p.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
      if (none && !p.querySelector('.chip.on')) none.classList.add('on');
    });
  });
}
export const pickerValue = (root, name) => Array.from(root.querySelectorAll(`[data-picker="${name}"] .chip.on`)).map((c) => c.dataset.id).filter(Boolean);

let modalStack = [];
export function openModal(html, { wide = false, onClose } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  const close = () => {
    wrap.classList.remove('show');
    setTimeout(() => wrap.remove(), 180);
    modalStack = modalStack.filter((m) => m !== close);
    if (onClose) onClose();
  };
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
  modalStack.push(close);
  const modal = wrap.firstElementChild;
  modal.close = close;
  const first = modal.querySelector('input[autofocus], textarea[autofocus]');
  if (first) setTimeout(() => first.focus(), 60);
  return modal;
}
export const closeTopModal = () => { const c = modalStack[modalStack.length - 1]; if (c) { c(); return true; } return false; };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTopModal(); });

export function confirmBox(message, okLabel = 'OK', danger = false) {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal(`<div class="confirm"><p>${esc(message)}</p><div class="row end">
      <button class="btn ghost" data-close>Cancel</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(okLabel)}</button></div></div>`, { onClose: () => { if (!done) resolve(false); } });
    m.querySelector('[data-ok]').onclick = () => { done = true; resolve(true); m.close(); };
  });
}

export function choiceBox(message, choices) {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal(`<div class="confirm"><p>${esc(message)}</p><div class="col">
      ${choices.map((c, i) => `<button class="btn ${c.danger ? 'danger' : ''}" data-i="${i}">${esc(c.label)}</button>`).join('')}
      <button class="btn ghost" data-close>Cancel</button></div></div>`, { onClose: () => { if (!done) resolve(null); } });
    m.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => { done = true; resolve(choices[+b.dataset.i].value); m.close(); }; });
  });
}

/** Resolves true when no PIN is set or the right PIN is entered. */
export function requirePin(reason = 'Parent PIN') {
  const pin = store.state.settings.pin;
  if (!pin) return Promise.resolve(true);
  return new Promise((resolve) => {
    let entry = '', done = false;
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'];
    const m = openModal(`<div class="pinpad"><h3>🔒 ${esc(reason)}</h3><div class="dots"></div>
      <div class="keys">${keys.map((k) => (k === '' ? '<span></span>' : `<button class="key" data-k="${k}">${k}</button>`)).join('')}</div>
      <button class="btn ghost" data-close>Cancel</button></div>`, { onClose: () => { if (!done) resolve(false); } });
    const dots = m.querySelector('.dots');
    const draw = () => { dots.innerHTML = Array.from({ length: pin.length }, (_, i) => `<i class="${i < entry.length ? 'on' : ''}"></i>`).join(''); };
    draw();
    m.querySelector('.keys').onclick = (e) => {
      const k = e.target.closest('[data-k]'); if (!k) return;
      entry = k.dataset.k === '⌫' ? entry.slice(0, -1) : entry + k.dataset.k;
      draw();
      if (entry.length === pin.length) {
        if (entry === pin) { done = true; resolve(true); m.close(); }
        else { dots.classList.add('shake'); setTimeout(() => { dots.classList.remove('shake'); entry = ''; draw(); }, 400); }
      }
    };
  });
}

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
}

export function celebrate(x, y, emoji = '⭐') {
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('span');
    s.className = 'burst';
    s.textContent = emoji;
    s.style.left = x + 'px'; s.style.top = y + 'px';
    const a = (Math.PI * 2 * i) / 10;
    s.style.setProperty('--dx', Math.cos(a) * 90 + 'px');
    s.style.setProperty('--dy', Math.sin(a) * 90 + 'px');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 800);
  }
}

export const EMOJIS = ['🌻', '🧢', '🐬', '🦊', '🐻', '🐱', '🐶', '🦄', '🚀', '⚽', '🎨', '🎸', '🌈', '🐢', '🦖', '👑', '🌙', '🍓'];
