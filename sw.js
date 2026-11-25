// Offline support: cache the app shell; always go to the network for weather, recipes and feeds.
const CACHE = 'familyhub-v4';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'icons/icon.svg', 'icons/icon-192.png',
  'js/app.js', 'js/util.js', 'js/store.js', 'js/family.js', 'js/ui.js', 'js/ics.js', 'js/quickadd.js', 'js/services.js', 'js/photos.js', 'js/editors.js', 'js/google.js',
  'js/views/today.js', 'js/views/calendar.js', 'js/views/chores.js', 'js/views/meals.js', 'js/views/lists.js', 'js/views/rewards.js', 'js/views/settings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // network first so updates arrive quickly; fall back to cache when offline
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
});
