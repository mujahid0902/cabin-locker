/* Cabin Locker service worker — caches the app shell only. Cash data always goes to Google live. */
const CACHE = 'cabin-locker-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', e => {
  // Cache each file separately so one missing file can never stop the service worker from installing.
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // API calls are POST — never cached
  const url = new URL(req.url);
  if (url.hostname.includes('script.google')) return;     // never intercept Google
  const same = url.origin === self.location.origin;
  const asset = url.hostname.includes('fonts.g') || url.hostname === 'unpkg.com';
  if (!same && !asset) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (same) {                                            // network first for our own files → always up to date
      try { const res = await fetch(req); if (res.ok) cache.put(req, res.clone()); return res; }
      catch { return (await cache.match(req)) || (await cache.match('./index.html')); }
    }
    const hit = await cache.match(req);                    // cache first for fonts / icons library
    if (hit) return hit;
    const res = await fetch(req); if (res.ok) cache.put(req, res.clone()); return res;
  })());
});
