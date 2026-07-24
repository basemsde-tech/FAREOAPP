const CACHE_NAME = 'fareo-v5.4';

/* Local, same-origin assets only. cache.addAll() is atomic — if any entry fails
   the whole install fails, so cross-origin URLs (e.g. Google Fonts) are NOT listed
   here. They're cached opportunistically at runtime in the fetch handler instead. */
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192-v52.png',
  './icon-512-v52.png',
  './icon-maskable-192-v52.png',
  './icon-maskable-512-v52.png',
  './favicon-64-v52.png',
  './apple-touch-icon-v52.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;

  // Only handle GET; let the browser deal with everything else.
  if (req.method !== 'GET') return;

  // Navigation requests: network-first so a new deploy is picked up, with an
  // offline fallback to the cached shell.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put('./index.html', clone));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Everything else: cache-first, then network. Runtime-cache successful GETs
  // (including cross-origin fonts) best-effort; never let a caching error break
  // the response.
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
