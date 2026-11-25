// Photo frame: photos live in IndexedDB on this device; screensaver shows them when idle.
import { store, occurrencesIn } from './store.js';
import { esc, fmtTime, fmtDayLong, addDays } from './util.js';

const DB = 'familyhub-photos';
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const tx = async (mode, fn) => {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction('photos', mode);
    const out = fn(t.objectStore('photos'));
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
  });
};

export const listPhotos = () => tx('readonly', (s) => s.getAll());
export const deletePhoto = (id) => tx('readwrite', (s) => s.delete(id));

/** Downscale to max 1920px so dozens of photos fit comfortably. */
export async function addPhotoFiles(files) {
  let n = 0;
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    const blob = await shrink(f).catch(() => f);
    await tx('readwrite', (s) => s.put({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), blob, name: f.name }));
    n++;
  }
  return n;
}
function shrink(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1920 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob((b) => (b ? res(b) : rej()), 'image/jpeg', 0.86);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

// ---------- screensaver ----------
let idleTimer = null, slideTimer = null, el = null, urls = [];

export function initIdle() {
  const reset = () => { if (el) stopScreensaver(); arm(); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => document.addEventListener(ev, reset, { passive: true }));
  arm();
}
function arm() {
  clearTimeout(idleTimer);
  const mins = +store.state.settings.screensaverMin;
  if (mins > 0) idleTimer = setTimeout(startScreensaver, mins * 60000);
}

export async function startScreensaver() {
  if (el) return;
  const photos = await listPhotos().catch(() => []);
  urls = photos.sort(() => Math.random() - 0.5).map((p) => URL.createObjectURL(p.blob));
  el = document.createElement('div');
  el.className = 'saver';
  el.innerHTML = `<div class="saver-img a"></div><div class="saver-img b"></div><div class="saver-info"><div class="saver-time"></div><div class="saver-date"></div><div class="saver-next"></div></div>`;
  document.body.appendChild(el);
  let i = 0, flip = false;
  const show = () => {
    if (!el) return;
    const now = new Date();
    el.querySelector('.saver-time').textContent = fmtTime(now).replace(/(am|pm)$/, ' $1');
    el.querySelector('.saver-date').textContent = fmtDayLong(now);
    const next = occurrencesIn(now, addDays(now, 2)).find((o) => !o.ev.allDay && o.start > now);
    el.querySelector('.saver-next').innerHTML = next ? `Next: <b>${esc(next.ev.title)}</b> · ${fmtTime(next.start)}` : '';
    if (urls.length) {
      const layer = el.querySelector(flip ? '.saver-img.b' : '.saver-img.a');
      const other = el.querySelector(flip ? '.saver-img.a' : '.saver-img.b');
      layer.style.backgroundImage = `url(${urls[i % urls.length]})`;
      layer.classList.add('on'); other.classList.remove('on');
      flip = !flip; i++;
    }
  };
  show();
  requestAnimationFrame(() => el && el.classList.add('show'));
  slideTimer = setInterval(show, 12000);
}

export function stopScreensaver() {
  clearInterval(slideTimer);
  if (el) { el.remove(); el = null; }
  urls.forEach((u) => URL.revokeObjectURL(u)); urls = [];
}

// ---------- night dimming ----------
export function applyNightDim() {
  const { nightDim, nightFrom, nightTo } = store.state.settings;
  const h = new Date().getHours();
  const night = nightFrom > nightTo ? h >= nightFrom || h < nightTo : h >= nightFrom && h < nightTo;
  document.body.classList.toggle('night', !!nightDim && night);
}
