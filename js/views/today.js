// Home screen: clock, weather, today's agenda, chore progress, meals, groceries, recipe ideas.
import { store, occurrencesOnDay, conflicts, choresFor, isDone, stars, mealOn, MEAL_LABELS, colorOf, visibleMembers } from '../store.js';
import { esc, fmtTime, fmtRange, fmtDayLong, fmtRelative, addDays, startOfDay, DAYS_SHORT } from '../util.js';
import { avatar, avatars } from '../ui.js';
import { weather, wmo, recipeIdeas, rotationIdeas } from '../services.js';
import { openEvent, openMealSlot, openIdea, openRecipe, ideaCard, newEventOn } from '../editors.js';
import { parseQuick } from '../quickadd.js';

let ideasCache = null, ideasErr = false, ideasLoading = false;

export function render(root, go) {
  const s = store.state;
  const now = new Date();
  const today = startOfDay(now);
  const occ = occurrencesOnDay(today);
  const clash = conflicts(occ);
  const timed = occ.filter((o) => !o.ev.allDay);
  const next = timed.find((o) => o.start > now);
  const tomorrow = occurrencesOnDay(addDays(today, 1)).slice(0, 4);
  const shop = s.lists.find((l) => l.kind === 'shopping');
  const shopOpen = shop ? shop.items.filter((i) => !i.done) : [];

  root.innerHTML = `
  ${s.sample ? `<div class="banner">👋 This is sample data so you can look around. <button class="btn small" data-act="settings">Set up your family</button> <button class="btn small ghost" data-act="clear-sample">Start fresh</button></div>` : ''}
  <header class="hero-head">
    <div><div class="clock" id="clock">${fmtTime(now)}</div><div class="date">${fmtDayLong(now)}</div></div>
    <div class="weather" id="weather">${s.settings.lat == null ? '<button class="btn ghost small" data-act="settings">☀️ Add your town for weather</button>' : '<span class="muted">Loading weather…</span>'}</div>
  </header>
  <form class="quick" id="quick"><input name="q" autocomplete="off" placeholder="✨ Quick add: “Soccer Tue 5–6pm @${esc((s.members.find((m) => m.kid) || s.members[0] || { name: 'Kiddo' }).name)} every week”"><button class="btn primary">Add</button></form>
  <div class="dash">
    <section class="card span-2 agenda">
      <div class="card-h"><h2>Today</h2>${next ? `<span class="pill" style="--c:${colorOf(next.ev.memberIds)}">Up next ${fmtRelative(next.start - now)} · ${esc(next.ev.title)}</span>` : ''}<button class="icon-btn" data-act="new-event" aria-label="New event">＋</button></div>
      ${occ.length ? `<ul class="agenda-list">${occ.map((o) => {
        const past = !o.ev.allDay && o.end < now;
        const live = !o.ev.allDay && o.start <= now && o.end > now;
        return `<li class="ag ${past ? 'past' : ''} ${live ? 'live' : ''}" style="--c:${colorOf(o.ev.memberIds)}" data-occ="${esc(o.key)}">
          <span class="ag-time">${o.ev.allDay ? 'All day' : fmtTime(o.start)}<small>${o.ev.allDay ? '' : fmtTime(o.end)}</small></span>
          <span class="ag-body"><b>${esc(o.ev.title)}</b>${o.ev.location ? `<small>📍 ${esc(o.ev.location)}</small>` : ''}${clash.has(o.key) ? '<small class="warn">⚠️ Overlaps another event</small>' : ''}</span>
          <span class="ag-who">${avatars(o.ev.memberIds)}</span></li>`;
      }).join('')}</ul>` : '<p class="empty">Nothing scheduled today. 🎉</p>'}
      ${tomorrow.length ? `<div class="tomorrow"><h3>Tomorrow</h3>${tomorrow.map((o) => `<span class="tm" style="--c:${colorOf(o.ev.memberIds)}">${o.ev.allDay ? '' : fmtTime(o.start) + ' '}${esc(o.ev.title)}</span>`).join('')}</div>` : ''}
    </section>
    <section class="card chores-card" data-act="chores">
      <div class="card-h"><h2>Chores</h2><span class="muted small">tap to open</span></div>
      <div class="ring-row">${visibleMembers().map((m) => {
        const list = choresFor(m.id, today);
        if (!list.length) return '';
        const done = list.filter((c) => isDone(c.id, m.id, today)).length;
        const pct = Math.round((done / list.length) * 100);
        return `<div class="ring-item"><div class="ring" style="--p:${pct};--c:${m.color}">${avatar(m, 'lg')}</div>
          <b>${esc(m.name)}</b><span class="muted small">${done}/${list.length} · ⭐ ${stars(m.id)}</span></div>`;
      }).join('') || '<p class="empty">No chores today.</p>'}</div>
    </section>
    <section class="card meals-card">
      <div class="card-h"><h2>Meals today</h2><button class="icon-btn" data-act="meals" aria-label="Meal plan">›</button></div>
      ${s.settings.mealSlots.map((slot) => { const m = mealOn(today, slot); return `<button class="meal-row" data-meal="${slot}"><span class="muted">${MEAL_LABELS[slot]}</span><b>${m ? esc(m.text) : '<span class="faint">+ add</span>'}</b></button>`; }).join('')}
    </section>
    <section class="card ideas-card span-2">
      <div class="card-h"><h2>Recipe ideas</h2><span class="muted small">${s.settings.dietary ? esc(s.settings.dietary) : 'tap one to cook or plan it'}</span><button class="icon-btn" data-act="shuffle" aria-label="New ideas">↻</button></div>
      <div class="ideas" id="ideas">${ideasHtml()}</div>
    </section>
    <section class="card shop-card" data-act="lists">
      <div class="card-h"><h2>🛒 ${esc(shop ? shop.name : 'Groceries')}</h2><span class="pill">${shopOpen.length}</span></div>
      ${shopOpen.length ? `<ul class="mini-list">${shopOpen.slice(0, 7).map((i) => `<li>${esc(i.text)}</li>`).join('')}${shopOpen.length > 7 ? `<li class="muted">+${shopOpen.length - 7} more</li>` : ''}</ul>` : '<p class="empty">List is empty.</p>'}
    </section>
  </div>`;

  // interactions
  root.onclick = (e) => {
    const t = e.target.closest('[data-act],[data-occ],[data-meal],[data-idea]');
    if (!t) return;
    if (t.dataset.occ) { const o = occ.find((x) => x.key === t.dataset.occ); if (o) openEvent(o.ev, o.start); return; }
    if (t.dataset.meal) { e.stopPropagation(); openMealSlot(today, t.dataset.meal); return; }
    if (t.dataset.idea) {
      e.stopPropagation();
      const own = s.recipes.find((r) => r.id === t.dataset.idea);
      if (own) return openRecipe(own);
      const i = (ideasCache || []).find((x) => x.extId === t.dataset.idea);
      if (i) openIdea(i);
      return;
    }
    const a = t.dataset.act;
    if (a === 'new-event') newEventOn(today);
    else if (a === 'shuffle') loadIdeas(root, true);
    else if (a === 'clear-sample') store.clearSample();
    else go(a);
  };
  root.querySelector('#quick').onsubmit = (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    if (!q) return;
    const p = parseQuick(q, s.members);
    openEvent({ title: p.title || q, start: p.start, end: p.end, allDay: p.allDay, memberIds: p.memberIds, repeat: p.repeat });
    e.target.q.value = '';
  };

  if (s.settings.lat != null) weather().then((w) => paintWeather(root, w)).catch(() => { const el = root.querySelector('#weather'); if (el) el.innerHTML = '<span class="muted">Weather unavailable</span>'; });
  if (!ideasCache && !ideasLoading) loadIdeas(root, false);
}

function ideasHtml() {
  const own = rotationIdeas(2);
  const saved = new Set(store.state.recipes.map((r) => r.extId).filter(Boolean));
  const web = (ideasCache || []).filter((i) => !saved.has(i.extId));
  let html = own.map((r) => ideaCard(r, '<span class="idea-tag">Ours</span>')).join('');
  if (ideasLoading && !web.length) html += '<div class="muted pad">Finding ideas…</div>';
  else if (ideasErr && !web.length) html += '<div class="muted pad">Recipe ideas need an internet connection.</div>';
  html += web.slice(0, own.length ? 4 : 5).map((i) => ideaCard(i, i.area ? `<span class="idea-tag">${esc(i.area)}</span>` : '')).join('');
  return html;
}

async function loadIdeas(root, shuffle) {
  ideasLoading = true;
  const el = root.querySelector('#ideas');
  if (el && shuffle) el.classList.add('loading');
  try { ideasCache = await recipeIdeas({ shuffle, n: 5 }); ideasErr = false; }
  catch (e) { ideasErr = true; }
  ideasLoading = false;
  const now = root.querySelector('#ideas');
  if (now) { now.classList.remove('loading'); now.innerHTML = ideasHtml(); }
}

function paintWeather(root, w) {
  const el = root.querySelector('#weather');
  if (!el || !w || !w.current) return;
  const unit = store.state.settings.units === 'celsius' ? '°C' : '°F';
  const [icon, label] = wmo(w.current.weather_code);
  const d = w.daily;
  el.innerHTML = `<div class="wx-now"><span class="wx-icon">${icon}</span><span class="wx-temp">${Math.round(w.current.temperature_2m)}°</span>
    <span class="wx-meta">${esc(label)}<small>H ${Math.round(d.temperature_2m_max[0])}° · L ${Math.round(d.temperature_2m_min[0])}°${d.precipitation_probability_max[0] ? ` · 💧${d.precipitation_probability_max[0]}%` : ''}</small><small class="faint">${esc(store.state.settings.place)}</small></span></div>
    <div class="wx-days">${d.time.slice(1, 6).map((t, i) => { const dt = new Date(t + 'T12:00'); return `<span><small>${DAYS_SHORT[dt.getDay()]}</small>${wmo(d.weather_code[i + 1])[0]}<small>${Math.round(d.temperature_2m_max[i + 1])}°</small></span>`; }).join('')}</div>`;
  el.title = unit;
}

/** Called each minute to keep the clock fresh without re-rendering everything. */
export function tick(root) {
  const c = root.querySelector('#clock');
  if (c) c.textContent = fmtTime(new Date());
}
