// Editors shared across screens: events, meal slots, recipes and recipe ideas.
import { store, member, REPEATS, MEAL_LABELS, addToGroceries } from './store.js';
import { esc, uid, ymd, parseLocal, toLocal, addDays, startOfDay, hm, fmtDayLong, fmtDayShort, fmtRange, parseYmd } from './util.js';
import { openModal, memberPicker, wirePicker, pickerValue, choiceBox, confirmBox, toast, avatars } from './ui.js';
import { lookupMeal } from './services.js';

// ---------------- events ----------------
export function openEvent(ev, occStart) {
  const isNew = !ev.id;
  const readOnly = !!ev.feedId;
  const s = parseLocal(ev.start), e = parseLocal(ev.end || ev.start);
  if (readOnly) {
    const feed = store.state.feeds.find((f) => f.id === ev.feedId);
    const os = occStart || s;
    const oe = new Date(os.getTime() + (e - s));
    openModal(`<h2>${esc(ev.title)}</h2>
      <p class="muted">${fmtDayLong(os)} · ${ev.allDay ? 'All day' : fmtRange(os, oe)}</p>
      ${ev.location ? `<p>📍 ${esc(ev.location)}</p>` : ''}
      ${ev.notes ? `<p class="pre">${esc(ev.notes)}</p>` : ''}
      <p class="muted small">From calendar feed “${esc(feed ? feed.name : 'feed')}”. Edit it in that calendar app.</p>
      <div class="row end"><button class="btn primary" data-close>Close</button></div>`);
    return;
  }
  const endInclusive = ev.allDay ? addDays(e, -1) : e;
  const m = openModal(`<form class="form">
    <h2>${isNew ? 'New event' : 'Edit event'}</h2>
    <input name="title" placeholder="What's happening?" value="${esc(ev.title || '')}" autofocus required>
    <label>Who</label>${memberPicker(ev.memberIds || [], { includeNone: true })}
    <div class="row wrap">
      <label class="switch"><input type="checkbox" name="allDay" ${ev.allDay ? 'checked' : ''}><span></span> All day</label>
    </div>
    <div class="grid2">
      <label>Starts<input type="date" name="sd" value="${ymd(s)}" required></label>
      <label class="t">Time<input type="time" name="st" value="${hm(s)}" step="300"></label>
      <label>Ends<input type="date" name="ed" value="${ymd(endInclusive)}" required></label>
      <label class="t">Time<input type="time" name="et" value="${hm(e)}" step="300"></label>
    </div>
    <div class="grid2">
      <label>Repeat<select name="repeat">${Object.entries(REPEATS).map(([k, v]) => `<option value="${k}" ${ev.repeat === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="until">Until (optional)<input type="date" name="until" value="${esc(ev.repeatUntil || '')}"></label>
    </div>
    <input name="location" placeholder="📍 Location (optional)" value="${esc(ev.location || '')}">
    <textarea name="notes" rows="2" placeholder="Notes">${esc(ev.notes || '')}</textarea>
    <div class="row between">
      ${isNew ? '<span></span>' : '<button type="button" class="btn danger ghost" data-del>Delete</button>'}
      <div class="row"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div>
    </div></form>`);
  wirePicker(m);
  const f = m.querySelector('form');
  const sync = () => {
    const ad = f.allDay.checked;
    m.querySelectorAll('.t').forEach((x) => { x.style.display = ad ? 'none' : ''; });
    m.querySelector('.until').style.visibility = f.repeat.value === 'none' ? 'hidden' : '';
  };
  f.allDay.onchange = sync; f.repeat.onchange = sync; sync();
  f.sd.onchange = () => { if (f.ed.value < f.sd.value) f.ed.value = f.sd.value; };
  f.st.onchange = () => {
    const ns = parseLocal(f.sd.value + 'T' + f.st.value);
    const ne = new Date(ns.getTime() + Math.max(15 * 60000, e - s));
    f.et.value = hm(ne); f.ed.value = ymd(ne);
  };
  f.onsubmit = (x) => {
    x.preventDefault();
    const allDay = f.allDay.checked;
    const start = allDay ? f.sd.value + 'T00:00' : f.sd.value + 'T' + (f.st.value || '09:00');
    let end = allDay ? toLocal(addDays(parseYmd(f.ed.value), 1)) : f.ed.value + 'T' + (f.et.value || f.st.value);
    if (parseLocal(end) <= parseLocal(start)) end = allDay ? toLocal(addDays(parseYmd(f.sd.value), 1)) : toLocal(new Date(parseLocal(start).getTime() + 3600000));
    const data = {
      title: f.title.value.trim(), memberIds: pickerValue(m, 'members'), allDay, start, end,
      repeat: f.repeat.value, repeatUntil: f.repeat.value !== 'none' ? f.until.value : '',
      location: f.location.value.trim(), notes: f.notes.value.trim(),
    };
    store.update((st) => {
      if (isNew) st.events.push(Object.assign({ id: uid(), exdates: [] }, data));
      else Object.assign(st.events.find((x) => x.id === ev.id), data);
    });
    m.close();
    toast(isNew ? 'Event added' : 'Event saved');
  };
  const del = m.querySelector('[data-del]');
  if (del) del.onclick = async () => {
    let mode = 'all';
    if (ev.repeat && ev.repeat !== 'none' && occStart) {
      mode = await choiceBox('Delete a repeating event', [{ label: `Only ${fmtDayShort(occStart)}`, value: 'one' }, { label: 'This and all future', value: 'future' }, { label: 'Every occurrence', value: 'all', danger: true }]);
      if (!mode) return;
    } else if (!(await confirmBox(`Delete “${ev.title}”?`, 'Delete', true))) return;
    store.update((st) => {
      const target = st.events.find((x) => x.id === ev.id);
      if (mode === 'one') (target.exdates = target.exdates || []).push(ymd(occStart));
      else if (mode === 'future') target.repeatUntil = ymd(addDays(occStart, -1));
      else st.events = st.events.filter((x) => x.id !== ev.id);
    });
    m.close();
  };
}

export function newEventOn(day, hour) {
  const s = startOfDay(day);
  if (hour === undefined) { const now = new Date(); hour = Math.min(21, now.getHours() + 1); }
  s.setHours(hour, 0);
  openEvent({ title: '', start: toLocal(s), end: toLocal(new Date(s.getTime() + 3600000)), memberIds: [], repeat: 'none' });
}

// ---------------- meal slots ----------------
export function openMealSlot(day, slot) {
  const key = ymd(day);
  const cur = (store.state.meals[key] || {})[slot] || {};
  const recipes = store.state.recipes.slice().sort((a, b) => a.title.localeCompare(b.title));
  const m = openModal(`<form class="form">
    <h2>${MEAL_LABELS[slot]} · ${fmtDayShort(day)}</h2>
    <input name="text" placeholder="e.g. Tacos, leftovers, eat out…" value="${esc(cur.text || '')}" autofocus>
    ${recipes.length ? `<label>Or pick a saved recipe<select name="recipe"><option value="">—</option>${recipes.map((r) => `<option value="${r.id}" ${cur.recipeId === r.id ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></label>` : ''}
    <div class="row between">
      <button type="button" class="btn ghost danger" data-clear>Clear</button>
      <div class="row"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div>
    </div></form>`);
  const f = m.querySelector('form');
  if (f.recipe) f.recipe.onchange = () => { const r = recipes.find((x) => x.id === f.recipe.value); if (r) f.text.value = r.title; };
  const write = (val) => store.update((s) => {
    const d = s.meals[key] || (s.meals[key] = {});
    if (val) d[slot] = val; else delete d[slot];
    if (!Object.keys(d).length) delete s.meals[key];
  });
  f.onsubmit = (x) => {
    x.preventDefault();
    const recipeId = f.recipe ? f.recipe.value : '';
    const text = f.text.value.trim();
    write(text || recipeId ? { text, recipeId } : null);
    m.close();
  };
  m.querySelector('[data-clear]').onclick = () => { write(null); m.close(); };
}

export function planMeal(day, slot, recipe) {
  store.update((s) => {
    const d = s.meals[ymd(day)] || (s.meals[ymd(day)] = {});
    d[slot] = { text: recipe.title, recipeId: recipe.id };
  });
}

// ---------------- recipes ----------------
const ingText = (i) => (typeof i === 'string' ? i : [i.qty, i.ing].filter(Boolean).join(' '));
const ingName = (i) => (typeof i === 'string' ? i : i.ing);

export function openRecipe(r) {
  const m = openModal(`<div class="recipe">
    ${r.image ? `<img class="hero" src="${esc(r.image)}" alt="">` : ''}
    <h2>${esc(r.title)}</h2>
    ${r.category || r.area ? `<p class="muted">${esc([r.area, r.category].filter(Boolean).join(' · '))}</p>` : ''}
    <div class="recipe-cols">
      <div><h3>Ingredients</h3><ul class="ings">${(r.ingredients || []).map((i) => `<li>${esc(ingText(i))}</li>`).join('') || '<li class="muted">None listed</li>'}</ul></div>
      <div><h3>Steps</h3><p class="pre steps">${esc(r.steps || '—')}</p>
      ${r.url ? `<p><a href="${esc(r.url)}" target="_blank" rel="noopener">Original recipe ↗</a></p>` : ''}
      ${r.video ? `<p><a href="${esc(r.video)}" target="_blank" rel="noopener">▶︎ Watch video</a></p>` : ''}</div>
    </div>
    <div class="row wrap end sticky-actions">
      <button class="btn" data-groc>🛒 Add ingredients</button>
      <button class="btn" data-plan>📅 Plan it</button>
      ${r.id ? '<button class="btn" data-edit>✏️ Edit</button><button class="btn" data-cooked>✅ Cooked it</button>' : '<button class="btn primary" data-save>⭐ Save to our recipes</button>'}
      <button class="btn ghost" data-close>Close</button>
    </div></div>`, { wide: true });
  const saved = () => (r.id ? r : saveIdea(r));
  m.querySelector('[data-groc]').onclick = () => { const n = addToGroceries((r.ingredients || []).map(ingName)); toast(n ? `Added ${n} item${n > 1 ? 's' : ''} to Groceries` : 'Already on the list'); };
  m.querySelector('[data-plan]').onclick = () => pickPlanDay(saved());
  const sv = m.querySelector('[data-save]');
  if (sv) sv.onclick = () => { saveIdea(r); toast('Saved to your recipes'); sv.remove(); };
  const ed = m.querySelector('[data-edit]');
  if (ed) ed.onclick = () => { m.close(); editRecipe(r); };
  const ck = m.querySelector('[data-cooked]');
  if (ck) ck.onclick = () => { store.update((s) => { const x = s.recipes.find((y) => y.id === r.id); if (x) x.lastCooked = ymd(new Date()); }); toast('Nice! Marked as cooked today'); };
}

export async function openIdea(idea) {
  if (idea.ingredients) return openRecipe(idea);
  try { const full = await lookupMeal(idea.extId); if (full) openRecipe(full); }
  catch (e) { toast('Could not load that recipe — are you online?'); }
}

function saveIdea(r) {
  const existing = store.state.recipes.find((x) => r.extId && x.extId === r.extId);
  if (existing) return existing;
  const rec = { id: uid(), extId: r.extId || '', title: r.title, image: r.image || '', ingredients: (r.ingredients || []).map(ingText), steps: r.steps || '', url: r.url || r.video || '', tags: [r.category].filter(Boolean), lastCooked: '' };
  store.update((s) => s.recipes.push(rec));
  return rec;
}

function pickPlanDay(recipe) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const m = openModal(`<div class="form"><h2>Plan “${esc(recipe.title)}”</h2>
    <label>Meal<select name="slot">${Object.entries(MEAL_LABELS).map(([k, v]) => `<option value="${k}" ${k === 'dinner' ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <div class="daygrid">${days.map((d, i) => `<button class="btn" data-d="${i}">${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDayShort(d)}</button>`).join('')}</div>
    <div class="row end"><button class="btn ghost" data-close>Cancel</button></div></div>`);
  m.querySelectorAll('[data-d]').forEach((b) => {
    b.onclick = () => { planMeal(days[+b.dataset.d], m.querySelector('[name=slot]').value, recipe); m.close(); toast('Added to the meal plan'); };
  });
}

export function editRecipe(r = {}) {
  const isNew = !r.id;
  const m = openModal(`<form class="form"><h2>${isNew ? 'New recipe' : 'Edit recipe'}</h2>
    <input name="title" placeholder="Recipe name" value="${esc(r.title || '')}" required autofocus>
    <label>Ingredients — one per line<textarea name="ings" rows="6">${esc((r.ingredients || []).map(ingText).join('\n'))}</textarea></label>
    <label>Steps<textarea name="steps" rows="5">${esc(r.steps || '')}</textarea></label>
    <input name="url" placeholder="Link (optional)" value="${esc(r.url || '')}">
    <input name="tags" placeholder="Tags, comma separated (e.g. quick, kid favorite)" value="${esc((r.tags || []).join(', '))}">
    <div class="row between">${isNew ? '<span></span>' : '<button type="button" class="btn ghost danger" data-del>Delete</button>'}
    <div class="row"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div></div></form>`, { wide: true });
  const f = m.querySelector('form');
  f.onsubmit = (x) => {
    x.preventDefault();
    const data = { title: f.title.value.trim(), ingredients: f.ings.value.split('\n').map((s) => s.trim()).filter(Boolean), steps: f.steps.value.trim(), url: f.url.value.trim(), tags: f.tags.value.split(',').map((s) => s.trim()).filter(Boolean) };
    store.update((s) => { if (isNew) s.recipes.push(Object.assign({ id: uid(), lastCooked: '', image: '' }, data)); else Object.assign(s.recipes.find((y) => y.id === r.id), data); });
    m.close();
  };
  const d = m.querySelector('[data-del]');
  if (d) d.onclick = async () => { if (await confirmBox(`Delete “${r.title}”?`, 'Delete', true)) { store.update((s) => { s.recipes = s.recipes.filter((y) => y.id !== r.id); }); m.close(); } };
}

export function ideaCard(idea, extra = '') {
  return `<button class="idea" data-idea="${esc(idea.extId || idea.id)}">
    ${idea.image ? `<img src="${esc(idea.image)}/preview" loading="lazy" alt="" onerror="this.onerror=null;this.src='${esc(idea.image)}'">` : '<span class="idea-ph">🍲</span>'}
    <span class="idea-t">${esc(idea.title)}</span>${extra}</button>`;
}

export { avatars, member };
