// Network services that need no API key: Open-Meteo (weather) and TheMealDB (recipe ideas).
import { store } from './store.js';
import { ymd } from './util.js';

const cacheGet = (k, maxAgeMs) => {
  try { const v = JSON.parse(localStorage.getItem(k)); if (v && Date.now() - v.t < maxAgeMs) return v.d; } catch (e) { /* ignore */ }
  return null;
};
const cacheSet = (k, d) => { try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), d })); } catch (e) { /* ignore */ } };

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
  return r.json();
}

// ---------- weather ----------
const WMO = {
  0: ['☀️', 'Clear'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Cloudy'],
  45: ['🌫️', 'Fog'], 48: ['🌫️', 'Fog'], 51: ['🌦️', 'Drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌦️', 'Drizzle'],
  56: ['🌧️', 'Freezing drizzle'], 57: ['🌧️', 'Freezing drizzle'], 61: ['🌧️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'],
  66: ['🌧️', 'Freezing rain'], 67: ['🌧️', 'Freezing rain'], 71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'], 77: ['🌨️', 'Snow grains'],
  80: ['🌦️', 'Showers'], 81: ['🌧️', 'Showers'], 82: ['⛈️', 'Heavy showers'], 85: ['🌨️', 'Snow showers'], 86: ['❄️', 'Snow showers'],
  95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Thunderstorm'], 99: ['⛈️', 'Thunderstorm'],
};
export const wmo = (c) => WMO[c] || ['🌡️', ''];

export async function geocode(q) {
  const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&name=${encodeURIComponent(q)}`);
  return (j.results || []).map((r) => ({ name: [r.name, r.admin1, r.country_code].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude }));
}

export async function weather(force = false) {
  const { lat, lon, units } = store.state.settings;
  if (lat == null) return null;
  const key = `fh.weather.${lat},${lon},${units}`;
  const c = !force && cacheGet(key, 20 * 60000);
  if (c) return c;
  const u = units === 'celsius' ? '' : '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch';
  const j = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=6${u}`);
  cacheSet(key, j);
  return j;
}

// ---------- recipes (TheMealDB, free test key "1") ----------
const MEALDB = 'https://www.themealdb.com/api/json/v1/1/';
export const DIETS = ['', 'Vegetarian', 'Vegan', 'Chicken', 'Seafood', 'Pasta', 'Beef', 'Breakfast', 'Dessert'];

export function normalizeMeal(m) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = (m['strIngredient' + i] || '').trim();
    const qty = (m['strMeasure' + i] || '').trim();
    if (ing) ingredients.push({ ing, qty });
  }
  return {
    extId: m.idMeal, title: m.strMeal, image: m.strMealThumb, category: m.strCategory || '', area: m.strArea || '',
    ingredients, steps: (m.strInstructions || '').trim(), url: m.strSource || '', video: m.strYoutube || '',
  };
}

export const lookupMeal = async (id) => {
  const j = await getJSON(MEALDB + 'lookup.php?i=' + id);
  return j.meals && j.meals[0] ? normalizeMeal(j.meals[0]) : null;
};

async function randomMeals(n) {
  const diet = store.state.settings.dietary;
  if (diet) {
    const j = await getJSON(MEALDB + 'filter.php?c=' + encodeURIComponent(diet));
    const pool = (j.meals || []).slice();
    const pick = [];
    while (pool.length && pick.length < n) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return (await Promise.all(pick.map((m) => lookupMeal(m.idMeal).catch(() => null)))).filter(Boolean);
  }
  const seen = new Set();
  const res = await Promise.all(Array.from({ length: n + 2 }, () => getJSON(MEALDB + 'random.php').catch(() => null)));
  return res.filter((j) => j && j.meals).map((j) => normalizeMeal(j.meals[0])).filter((m) => !seen.has(m.extId) && seen.add(m.extId)).slice(0, n);
}

/** Today's recipe ideas, cached for the day so the screen stays stable. */
export async function recipeIdeas({ shuffle = false, n = 4 } = {}) {
  const key = 'fh.ideas.' + ymd(new Date()) + '.' + store.state.settings.dietary;
  if (!shuffle) { const c = cacheGet(key, 24 * 3600000); if (c) return c; }
  const ideas = await randomMeals(n);
  if (!ideas.length) throw new Error('offline');
  cacheSet(key, ideas);
  return ideas;
}

/** "What can I make with ___?" */
export async function mealsWithIngredient(ing) {
  const j = await getJSON(MEALDB + 'filter.php?i=' + encodeURIComponent(ing.trim().toLowerCase().replace(/\s+/g, '_')));
  return (j.meals || []).slice(0, 12).map((m) => ({ extId: m.idMeal, title: m.strMeal, image: m.strMealThumb }));
}

export async function searchMeals(q) {
  const j = await getJSON(MEALDB + 'search.php?s=' + encodeURIComponent(q));
  return (j.meals || []).slice(0, 12).map(normalizeMeal);
}

/** Saved family recipes that haven't been cooked for a while. */
export function rotationIdeas(n = 3) {
  const cutoff = ymd(new Date(Date.now() - 10 * 86400000));
  const busy = new Set();
  for (const [day, slots] of Object.entries(store.state.meals)) {
    if (day < cutoff) continue;
    for (const slot of Object.values(slots)) if (slot && slot.recipeId) busy.add(slot.recipeId);
  }
  return store.state.recipes
    .filter((r) => !busy.has(r.id) && (!r.lastCooked || r.lastCooked < cutoff))
    .sort((a, b) => (a.lastCooked || '').localeCompare(b.lastCooked || ''))
    .slice(0, n);
}

// ---------- calendar feeds (.ics URLs) ----------
export async function fetchText(url) {
  const proxy = store.state.settings.corsProxy;
  const target = url.replace(/^webcal:/i, 'https:');
  try {
    const r = await fetch(target);
    if (r.ok) return r.text();
    throw new Error(r.status);
  } catch (e) {
    if (!proxy) throw new Error('The calendar server blocked direct access from the browser. Add a CORS proxy in Settings → Calendar feeds.');
    const r = await fetch(proxy.includes('{url}') ? proxy.replace('{url}', encodeURIComponent(target)) : proxy + encodeURIComponent(target));
    if (!r.ok) throw new Error('Proxy error ' + r.status);
    return r.text();
  }
}
