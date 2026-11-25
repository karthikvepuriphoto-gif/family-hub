// Meal planner: weekly grid, recipe ideas ("what can I make with…"), and the family recipe box.
import { store, mealOn, MEAL_LABELS, addToGroceries } from '../store.js';
import { esc, addDays, startOfDay, startOfWeek, isToday, fmtDayShort, DAYS_SHORT, MONTHS } from '../util.js';
import { toast } from '../ui.js';
import { openMealSlot, openRecipe, openIdea, editRecipe, ideaCard } from '../editors.js';
import { recipeIdeas, mealsWithIngredient, searchMeals, DIETS } from '../services.js';

const ui = { week: startOfWeek(new Date(), store.state.settings.weekStart), tab: 'plan', results: null, query: '', busy: false };

export function render(root) {
  const s = store.state;
  root.innerHTML = `<div class="toolbar">
      <div class="seg">${[['plan', '📅 Plan'], ['ideas', '💡 Ideas'], ['box', '📖 Our recipes']].map(([k, l]) => `<button class="${ui.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      ${ui.tab === 'plan' ? `<div class="row"><button class="icon-btn" data-wk="-1">‹</button><b>${weekLabel()}</b><button class="icon-btn" data-wk="1">›</button><button class="btn" data-groc>🛒 Week's ingredients → list</button></div>` : ''}
      ${ui.tab === 'box' ? '<button class="btn primary" data-newrec>＋ New recipe</button>' : ''}
    </div>
    <div id="mealbody">${ui.tab === 'plan' ? plan() : ui.tab === 'ideas' ? ideas() : box()}</div>`;

  root.onclick = async (e) => {
    const t = e.target;
    const tab = t.closest('[data-tab]'); if (tab) { ui.tab = tab.dataset.tab; return render(root); }
    const wk = t.closest('[data-wk]'); if (wk) { ui.week = addDays(ui.week, 7 * +wk.dataset.wk); return render(root); }
    const cell = t.closest('[data-cell]'); if (cell) { const [i, slot] = cell.dataset.cell.split(':'); return openMealSlot(addDays(ui.week, +i), slot); }
    if (t.closest('[data-groc]')) return weekToGroceries();
    if (t.closest('[data-newrec]')) return editRecipe({});
    const rec = t.closest('[data-rec]'); if (rec) return openRecipe(s.recipes.find((r) => r.id === rec.dataset.rec));
    const idea = t.closest('[data-idea]');
    if (idea) {
      const own = s.recipes.find((r) => r.id === idea.dataset.idea);
      if (own) return openRecipe(own);
      const i = (ui.results || []).find((x) => x.extId === idea.dataset.idea);
      if (i) openIdea(i);
      return;
    }
    if (t.closest('[data-surprise]')) return run(root, () => recipeIdeas({ shuffle: true, n: 8 }), 'Surprise me');
    const q = t.closest('[data-quickq]'); if (q) { ui.query = q.dataset.quickq; return run(root, () => mealsWithIngredient(ui.query), `With ${ui.query}`); }
  };
  const form = root.querySelector('#ideaform');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      ui.query = form.q.value.trim();
      if (!ui.query) return;
      const mode = form.mode.value;
      run(root, () => (mode === 'ing' ? mealsWithIngredient(ui.query) : searchMeals(ui.query)), mode === 'ing' ? `With ${ui.query}` : `“${ui.query}”`);
    };
    form.diet.onchange = () => { ui.results = null; store.update((st) => { st.settings.dietary = form.diet.value; }); };
  }
  if (ui.tab === 'ideas' && !ui.results && !ui.busy) run(root, () => recipeIdeas({ n: 8 }), "Today's picks");
}

function weekLabel() {
  const b = addDays(ui.week, 6);
  return `${MONTHS[ui.week.getMonth()].slice(0, 3)} ${ui.week.getDate()} – ${ui.week.getMonth() !== b.getMonth() ? MONTHS[b.getMonth()].slice(0, 3) + ' ' : ''}${b.getDate()}`;
}

function plan() {
  const slots = store.state.settings.mealSlots;
  const days = Array.from({ length: 7 }, (_, i) => addDays(ui.week, i));
  return `<div class="mealgrid" style="--slots:${slots.length}">
    <span></span>${slots.map((s) => `<span class="mg-h">${MEAL_LABELS[s]}</span>`).join('')}
    ${days.map((d, i) => `<span class="mg-day ${isToday(d) ? 'today' : ''}"><small>${DAYS_SHORT[d.getDay()]}</small><b>${d.getDate()}</b></span>
      ${slots.map((slot) => { const m = mealOn(d, slot); const r = m && m.recipeId ? store.state.recipes.find((x) => x.id === m.recipeId) : null;
        return `<button class="mg-cell ${m ? 'filled' : ''} ${isToday(d) ? 'today' : ''}" data-cell="${i}:${slot}">${r && r.image ? `<img src="${esc(r.image)}/preview" alt="">` : ''}<span>${m ? esc(m.text) : '+'}</span></button>`; }).join('')}`).join('')}
  </div>`;
}

function ideas() {
  const diet = store.state.settings.dietary;
  const quick = ['chicken', 'rice', 'eggs', 'potatoes', 'pasta', 'beans', 'salmon', 'tofu', 'spinach'];
  return `<form id="ideaform" class="ideaform">
      <select name="mode"><option value="ing">What can I make with…</option><option value="name">Search recipes for…</option></select>
      <input name="q" placeholder="e.g. chicken, potatoes" value="${esc(ui.query)}">
      <button class="btn primary">Find</button>
      <select name="diet" title="Preference">${DIETS.map((d) => `<option value="${d}" ${d === diet ? 'selected' : ''}>${d || 'Any style'}</option>`).join('')}</select>
      <button type="button" class="btn" data-surprise>🎲 Surprise me</button>
    </form>
    <div class="quickq">${quick.map((q) => `<button class="chip on" style="--c:#2f9e44" data-quickq="${q}">${q}</button>`).join('')}</div>
    <h3 class="section-h" id="ideas-h">${esc(ui.label || '')}</h3>
    <div class="ideas grid">${ui.busy ? '<p class="muted pad">Looking…</p>' : ui.error ? `<p class="muted pad">${esc(ui.error)}</p>` : (ui.results || []).map((i) => ideaCard(i, i.category ? `<span class="idea-tag">${esc(i.category)}</span>` : '')).join('') || '<p class="muted pad">No matches — try another ingredient.</p>'}</div>
    <p class="small faint">Ideas from TheMealDB (free). Tap one to see ingredients, add them to Groceries, or plan it for a day.</p>`;
}

async function run(root, fn, label) {
  ui.busy = true; ui.error = ''; ui.label = label;
  render(root);
  try { ui.results = await fn(); }
  catch (e) { ui.results = []; ui.error = 'Recipe ideas need an internet connection.'; }
  ui.busy = false;
  if (document.body.contains(root) && ui.tab === 'ideas') render(root);
}

function box() {
  const rs = store.state.recipes.slice().sort((a, b) => a.title.localeCompare(b.title));
  if (!rs.length) return '<p class="empty">No saved recipes yet. Save ideas you like, or add your family favorites.</p>';
  return `<div class="ideas grid">${rs.map((r) => `<button class="idea" data-rec="${r.id}">${r.image ? `<img src="${esc(r.image)}/preview" alt="" loading="lazy">` : '<span class="idea-ph">🍲</span>'}
    <span class="idea-t">${esc(r.title)}</span>${r.lastCooked ? `<span class="idea-tag">Cooked ${esc(r.lastCooked.slice(5).replace('-', '/'))}</span>` : (r.tags || []).length ? `<span class="idea-tag">${esc(r.tags[0])}</span>` : ''}</button>`).join('')}</div>`;
}

function weekToGroceries() {
  const s = store.state;
  const items = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(ui.week, i);
    for (const slot of Object.keys(MEAL_LABELS)) {
      const m = mealOn(d, slot);
      const r = m && m.recipeId ? s.recipes.find((x) => x.id === m.recipeId) : null;
      if (r) items.push(...r.ingredients);
    }
  }
  if (!items.length) { toast('Plan some saved recipes first — their ingredients get added.'); return; }
  const n = addToGroceries(items);
  toast(n ? `Added ${n} item${n > 1 ? 's' : ''} to Groceries` : 'Everything is already on the list');
}

export { fmtDayShort, startOfDay };
