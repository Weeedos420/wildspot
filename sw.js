// Service worker: keeps the app shell and map assets available offline.
const APP = 'wildspot-app-v1';
const TILES = 'wildspot-tiles-v1'; // shared with app.js
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'db.js', 'shared.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js', 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('wildspot-app-') && k !== APP).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' }) || (req.mode === 'navigate' && await caches.match('index.html'));
    if (hit) return hit;
    throw new Error('offline');
  }
}
async function cacheFirst(req, cacheName) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(cacheName)).put(req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.includes('/data/cells/')) return; // stored in IndexedDB by app.js
  if (url.origin === location.origin) return e.respondWith(networkFirst(req, APP)); // fresh code when online
  if (url.hostname === 'unpkg.com') return e.respondWith(cacheFirst(req, APP));
  if (url.hostname === 'tiles.openfreemap.org') {
    if (/\/\d+\/\d+\/\d+\.\w+$/.test(url.pathname)) return; // map tiles are cached by app.js under version-free keys
    if (url.pathname.startsWith('/styles/') || !/\.\w+$/.test(url.pathname)) return e.respondWith(networkFirst(req, TILES));
    return e.respondWith(cacheFirst(req, TILES)); // fonts, sprites
  }
});
