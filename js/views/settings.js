// Settings: family members, weather, display, photos, calendar feeds, PIN and backups.
import { store, COLORS } from '../store.js';
import { esc, uid, ymd } from '../util.js';
import { avatar, openModal, confirmBox, toast, EMOJIS } from '../ui.js';
import { geocode, fetchText, DIETS } from '../services.js';
import { parseICS } from '../ics.js';
import { listPhotos, addPhotoFiles, deletePhoto, startScreensaver } from '../photos.js';

export function render(root, go, ctx) {
  const s = store.state, st = s.settings;
  root.innerHTML = `<div class="settings">
  <section class="card"><div class="card-h"><h2>👪 Family</h2></div>
    <label>Family name<input data-set="familyName" value="${esc(st.familyName)}"></label>
    <div class="members">${s.members.map((m) => `<button class="mrow" data-member="${m.id}">${avatar(m)}<b>${esc(m.name)}</b><span class="muted small">${m.kid ? 'Kid · earns stars' : 'Grown-up'}</span></button>`).join('')}</div>
    <button class="btn" data-addmember>＋ Add family member</button>
  </section>

  <section class="card"><div class="card-h"><h2>☀️ Weather</h2></div>
    <form class="row" id="geo"><input name="q" placeholder="Town or ZIP, e.g. Lincoln, NE" value="${esc(st.place)}"><button class="btn">Search</button><button type="button" class="btn ghost" data-locate>📍 Use my location</button></form>
    <div id="georesults"></div>
    <label>Units<select data-set="units"><option value="fahrenheit" ${st.units !== 'celsius' ? 'selected' : ''}>°F</option><option value="celsius" ${st.units === 'celsius' ? 'selected' : ''}>°C</option></select></label>
  </section>

  <section class="card"><div class="card-h"><h2>🖥️ Display</h2></div>
    <label>Theme<select data-set="theme"><option value="auto" ${st.theme === 'auto' ? 'selected' : ''}>Match device</option><option value="light" ${st.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${st.theme === 'dark' ? 'selected' : ''}>Dark</option></select></label>
    <label>Week starts on<select data-set="weekStart" data-num><option value="0" ${+st.weekStart === 0 ? 'selected' : ''}>Sunday</option><option value="1" ${+st.weekStart === 1 ? 'selected' : ''}>Monday</option></select></label>
    <label>Photo screensaver after<select data-set="screensaverMin" data-num>${[0, 2, 5, 10, 15, 30, 60].map((n) => `<option value="${n}" ${+st.screensaverMin === n ? 'selected' : ''}>${n ? n + ' minutes idle' : 'Never'}</option>`).join('')}</select></label>
    <label class="switch"><input type="checkbox" data-set="keepAwake" ${st.keepAwake ? 'checked' : ''}><span></span> Keep screen awake while open ${'wakeLock' in navigator ? '' : '<small class="muted">(not supported by this browser — use the device’s display settings)</small>'}</label>
    <label class="switch"><input type="checkbox" data-set="nightDim" ${st.nightDim ? 'checked' : ''}><span></span> Dim the screen at night</label>
    <div class="row">from <select data-set="nightFrom" data-num>${hours(st.nightFrom)}</select> to <select data-set="nightTo" data-num>${hours(st.nightTo)}</select></div>
    <label>Meals to plan</label><div class="row wrap">${['breakfast', 'lunch', 'dinner', 'snack'].map((k) => `<label class="switch"><input type="checkbox" data-slot="${k}" ${st.mealSlots.includes(k) ? 'checked' : ''}><span></span> ${k[0].toUpperCase() + k.slice(1)}</label>`).join('')}</div>
    <label>Recipe idea style<select data-set="dietary">${DIETS.map((d) => `<option value="${d}" ${d === st.dietary ? 'selected' : ''}>${d || 'Anything'}</option>`).join('')}</select></label>
    <div class="row wrap"><button class="btn" data-fullscreen>⛶ Full screen</button><button class="btn" data-saver>🖼️ Preview screensaver</button></div>
  </section>

  <section class="card"><div class="card-h"><h2>🖼️ Photo frame</h2><span class="muted small" id="pcount"></span></div>
    <p class="muted small">Photos stay on this device and show in the screensaver.</p>
    <label class="btn file">＋ Add photos<input type="file" accept="image/*" multiple id="photoin" hidden></label>
    <div class="thumbs" id="thumbs"></div>
  </section>

  <section class="card"><div class="card-h"><h2>📆 Calendars</h2></div>
    <p class="muted small">Subscribe to a Google, iCloud or Outlook calendar by its <b>secret iCal / .ics address</b> (Google: Calendar settings → “Secret address in iCal format”; iCloud: Share calendar → Public calendar). Feeds are read-only here and refresh every 30 minutes.</p>
    <div class="feeds">${s.feeds.map((f) => `<div class="mrow"><span class="dot" style="--c:${(s.members.find((m) => m.id === f.memberId) || {}).color || '#5c6b7a'}"></span><b>${esc(f.name)}</b><span class="muted small">${f.error ? '⚠️ ' + esc(f.error) : f.last ? `${(s.feedEvents[f.id] || []).length} events · updated ${new Date(f.last).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'not loaded yet'}</span><button class="icon-btn" data-delfeed="${f.id}">🗑️</button></div>`).join('')}</div>
    <form id="feedform" class="form tight">
      <input name="url" placeholder="https://… or webcal://… .ics address" required>
      <div class="row"><input name="name" placeholder="Name (e.g. Mom's work)" required>
      <select name="member"><option value="">Everyone</option>${s.members.map((m) => `<option value="${m.id}">${esc(m.emoji)} ${esc(m.name)}</option>`).join('')}</select>
      <button class="btn primary">Subscribe</button></div>
    </form>
    <div class="row wrap"><button class="btn" data-refresh>↻ Refresh feeds</button><label class="btn file">⬆️ Import .ics file<input type="file" accept=".ics,text/calendar" id="icsin" hidden></label></div>
    <details><summary class="small">Feed won't load? (CORS proxy)</summary>
      <p class="muted small">Some calendar servers block browsers from reading feeds directly. You can point the app at a CORS proxy you trust (for example your own Cloudflare Worker). Use <code>{url}</code> where the feed address goes, or leave it at the end.</p>
      <input data-set="corsProxy" placeholder="https://my-proxy.example.workers.dev/?url={url}" value="${esc(st.corsProxy)}"></details>
  </section>

  <section class="card"><div class="card-h"><h2>🔒 Parent PIN</h2></div>
    <p class="muted small">Asked before editing chores and rewards, approving rewards, and opening Settings.</p>
    <div class="row"><input type="password" inputmode="numeric" maxlength="6" placeholder="${st.pin ? '••••  (PIN is set)' : '4–6 digits'}" id="pinin"><button class="btn" data-setpin>${st.pin ? 'Change' : 'Set PIN'}</button>${st.pin ? '<button class="btn ghost" data-clearpin>Remove</button>' : ''}</div>
  </section>

  <section class="card"><div class="card-h"><h2>💾 Backup & devices</h2></div>
    <p class="muted small">Everything is saved in this browser on this device. Use a backup file to move it to another tablet or computer.</p>
    <div class="row wrap"><button class="btn" data-export>⬇️ Download backup</button><label class="btn file">⬆️ Restore backup<input type="file" accept=".json,application/json" id="restorein" hidden></label>
    <button class="btn ghost danger" data-reset>Erase everything</button></div>
  </section>
  <p class="faint small center">Family Hub · open source · <a href="https://github.com/karthikvepuriphoto-gif/family-hub" target="_blank" rel="noopener">GitHub</a></p>
  </div>`;

  // simple settings fields
  root.querySelectorAll('[data-set]').forEach((el) => {
    el.addEventListener('change', () => {
      const k = el.dataset.set;
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (el.hasAttribute('data-num')) v = +v;
      store.update((x) => { x.settings[k] = v; });
      if (ctx && ctx.onSettings) ctx.onSettings(k);
    });
  });
  root.querySelectorAll('[data-slot]').forEach((el) => el.addEventListener('change', () => {
    store.update((x) => {
      const order = ['breakfast', 'lunch', 'dinner', 'snack'];
      const set = new Set(x.settings.mealSlots);
      if (el.checked) set.add(el.dataset.slot); else set.delete(el.dataset.slot);
      x.settings.mealSlots = order.filter((o) => set.has(o));
    });
  }));

  root.querySelector('#geo').onsubmit = async (e) => {
    e.preventDefault();
    const out = root.querySelector('#georesults');
    out.innerHTML = '<p class="muted small">Searching…</p>';
    try {
      const res = await geocode(e.target.q.value.replace(/,.*$/, '').trim() || e.target.q.value);
      out.innerHTML = res.length ? res.map((r, i) => `<button class="btn small" data-geo="${i}">${esc(r.name)}</button>`).join(' ') : '<p class="muted small">No places found.</p>';
      out.onclick = (ev) => { const b = ev.target.closest('[data-geo]'); if (!b) return; const r = res[+b.dataset.geo]; store.update((x) => Object.assign(x.settings, { place: r.name, lat: r.lat, lon: r.lon })); toast('Weather location saved'); };
    } catch (err) { out.innerHTML = '<p class="muted small">Could not search — are you online?</p>'; }
  };

  root.onclick = async (e) => {
    const t = e.target;
    const mb = t.closest('[data-member]'); if (mb) return editMember(s.members.find((m) => m.id === mb.dataset.member));
    if (t.closest('[data-addmember]')) return editMember({});
    if (t.closest('[data-locate]')) {
      navigator.geolocation.getCurrentPosition((p) => { store.update((x) => Object.assign(x.settings, { place: 'My location', lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) })); toast('Weather location saved'); }, () => toast('Location not available — search for your town instead'));
      return;
    }
    if (t.closest('[data-fullscreen]')) { const d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen || (() => toast('Use “Add to Home Screen” for full screen'))).call(d); return; }
    if (t.closest('[data-saver]')) return startScreensaver();
    if (t.closest('[data-refresh]')) { ctx.refreshFeeds(true); toast('Refreshing calendars…'); return; }
    const df = t.closest('[data-delfeed]');
    if (df && (await confirmBox('Remove this calendar feed?', 'Remove', true))) { store.update((x) => { x.feeds = x.feeds.filter((f) => f.id !== df.dataset.delfeed); delete x.feedEvents[df.dataset.delfeed]; }); return; }
    if (t.closest('[data-setpin]')) {
      const v = root.querySelector('#pinin').value.trim();
      if (!/^\d{4,6}$/.test(v)) { toast('PIN must be 4–6 digits'); return; }
      store.update((x) => { x.settings.pin = v; }); toast('PIN saved'); return;
    }
    if (t.closest('[data-clearpin]')) { store.update((x) => { x.settings.pin = ''; }); toast('PIN removed'); return; }
    if (t.closest('[data-export]')) return exportBackup();
    if (t.closest('[data-reset]') && (await confirmBox('Erase all events, chores, meals, lists and settings on this device? Photos are kept.', 'Erase', true))) { store.reset(); toast('Reset to sample data'); }
  };

  root.querySelector('#feedform').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    const feed = { id: uid(), url: f.url.value.trim(), name: f.name.value.trim(), memberId: f.member.value };
    store.update((x) => x.feeds.push(feed));
    ctx.refreshFeeds(true);
  };
  root.querySelector('#icsin').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const who = await pickMember();
    const evs = parseICS(await file.text(), { memberIds: who ? [who] : [] });
    store.update((x) => { x.events.push(...evs.map((ev) => { delete ev.uidRef; return ev; })); });
    toast(`Imported ${evs.length} events`);
  };
  root.querySelector('#restorein').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.members || !data.settings) throw new Error('not a backup');
      if (await confirmBox('Replace everything on this device with this backup?', 'Restore', true)) { store.replace(data); toast('Backup restored'); }
    } catch (err) { toast('That file is not a Family Hub backup'); }
  };

  // photos
  const thumbs = root.querySelector('#thumbs');
  const drawPhotos = async () => {
    const ps = await listPhotos().catch(() => []);
    root.querySelector('#pcount').textContent = ps.length ? `${ps.length} photo${ps.length > 1 ? 's' : ''}` : '';
    thumbs.querySelectorAll('img').forEach((i) => URL.revokeObjectURL(i.src));
    thumbs.innerHTML = ps.map((p) => `<button class="thumb" data-photo="${p.id}"><img src="${URL.createObjectURL(p.blob)}" alt=""><span>✕</span></button>`).join('');
  };
  drawPhotos();
  thumbs.onclick = async (e) => { const b = e.target.closest('[data-photo]'); if (b && (await confirmBox('Remove this photo?', 'Remove', true))) { await deletePhoto(b.dataset.photo); drawPhotos(); } };
  root.querySelector('#photoin').onchange = async (e) => { toast('Adding photos…'); const n = await addPhotoFiles(Array.from(e.target.files)); toast(`Added ${n} photo${n === 1 ? '' : 's'}`); drawPhotos(); };
}

const hours = (sel) => Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${+sel === h ? 'selected' : ''}>${h === 0 ? '12am' : h < 12 ? h + 'am' : h === 12 ? '12pm' : h - 12 + 'pm'}</option>`).join('');

function pickMember() {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal(`<div class="form"><h2>Whose calendar is this?</h2><div class="col">
      <button class="btn" data-w="">👪 Everyone</button>${store.state.members.map((x) => `<button class="btn" data-w="${x.id}">${esc(x.emoji)} ${esc(x.name)}</button>`).join('')}</div></div>`, { onClose: () => { if (!done) resolve(''); } });
    m.onclick = (e) => { const b = e.target.closest('[data-w]'); if (b) { done = true; resolve(b.dataset.w); m.close(); } };
  });
}

function editMember(mb) {
  const isNew = !mb.id;
  const s = store.state;
  mb = Object.assign({ name: '', color: COLORS[s.members.length % COLORS.length], emoji: EMOJIS[s.members.length % EMOJIS.length], kid: false }, mb);
  const m = openModal(`<form class="form"><h2>${isNew ? 'Add family member' : 'Edit ' + esc(mb.name)}</h2>
    <div class="row"><input name="emoji" class="emoji-in" value="${esc(mb.emoji)}" maxlength="4"><input name="name" placeholder="Name" value="${esc(mb.name)}" required autofocus></div>
    <div class="emoji-row">${EMOJIS.map((x) => `<button type="button" data-e="${x}">${x}</button>`).join('')}</div>
    <label>Color</label><div class="swatches">${COLORS.map((c) => `<label><input type="radio" name="color" value="${c}" ${c === mb.color ? 'checked' : ''}><span style="--c:${c}"></span></label>`).join('')}</div>
    <label class="switch"><input type="checkbox" name="kid" ${mb.kid ? 'checked' : ''}><span></span> Kid (shows in the reward shop)</label>
    <div class="row between">${isNew ? '<span></span>' : '<button type="button" class="btn ghost danger" data-del>Remove</button>'}
      <div class="row"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div></div></form>`);
  const f = m.querySelector('form');
  m.querySelector('.emoji-row').onclick = (e) => { const b = e.target.closest('[data-e]'); if (b) f.emoji.value = b.dataset.e; };
  f.onsubmit = (e) => {
    e.preventDefault();
    const data = { name: f.name.value.trim(), emoji: f.emoji.value.trim() || '🙂', color: f.color.value, kid: f.kid.checked };
    store.update((x) => { if (isNew) x.members.push(Object.assign({ id: uid() }, data)); else Object.assign(x.members.find((y) => y.id === mb.id), data); });
    m.close();
  };
  const d = m.querySelector('[data-del]');
  if (d) d.onclick = async () => {
    if (!(await confirmBox(`Remove ${mb.name}? Their events stay on the calendar under “Everyone”; their chores are removed.`, 'Remove', true))) return;
    store.update((x) => {
      x.members = x.members.filter((y) => y.id !== mb.id);
      x.events.forEach((ev) => { ev.memberIds = (ev.memberIds || []).filter((id) => id !== mb.id); });
      x.chores.forEach((c) => { c.memberIds = c.memberIds.filter((id) => id !== mb.id); });
      x.chores = x.chores.filter((c) => c.memberIds.length);
      x.settings.hidden = x.settings.hidden.filter((id) => id !== mb.id);
    });
    m.close();
  };
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(store.state, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `family-hub-backup-${ymd(new Date())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export { fetchText };
