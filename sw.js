const CACHE_NAME = 'fareo-v8.23';
const ROLLBACK_CACHE = 'fareo-rollback';
const META_CACHE = 'fareo-meta';

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

async function copyCache(fromName, toName) {
  const src = await caches.open(fromName);
  await caches.delete(toName);
  const dest = await caches.open(toName);
  const reqs = await src.keys();
  await Promise.all(reqs.map(async (req) => {
    const res = await src.match(req);
    if (res) await dest.put(req, res.clone());
  }));
}

async function snapshotPreviousForRollback() {
  const keys = await caches.keys();
  const prev = keys
    .filter((k) => k.startsWith('fareo-v') && k !== CACHE_NAME)
    .sort()
    .pop();
  if (prev) {
    await copyCache(prev, ROLLBACK_CACHE);
  }
}

async function isRollbackMode() {
  try {
    const c = await caches.open(META_CACHE);
    const r = await c.match('use-rollback');
    return !!(r && (await r.text()) === '1');
  } catch (_) {
    return false;
  }
}

async function setRollbackMode(on) {
  const c = await caches.open(META_CACHE);
  if (on) await c.put('use-rollback', new Response('1'));
  else await c.delete('use-rollback');
}

async function matchFrom(cacheName, req) {
  const c = await caches.open(cacheName);
  return (
    (await c.match(req)) ||
    (await c.match('./index.html')) ||
    (await c.match('./')) ||
    (await c.match('/index.html'))
  );
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      await snapshotPreviousForRollback();
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
      /* First install: take over. Later updates wait for the Update now button. */
      if (!self.registration.active) return self.skipWaiting();
    })()
  );
});

self.addEventListener('message', (e) => {
  const data = e.data;
  if (data === 'SKIP_WAITING' || (data && data.type === 'SKIP_WAITING')) {
    setRollbackMode(false).then(() => self.skipWaiting());
    return;
  }
  if (data && data.type === 'ROLLBACK') {
    e.waitUntil(
      (async () => {
        const has = await caches.has(ROLLBACK_CACHE);
        const rb = has ? await caches.open(ROLLBACK_CACHE) : null;
        const keys = rb ? await rb.keys() : [];
        if (!keys.length) {
          if (e.ports && e.ports[0]) e.ports[0].postMessage({ ok: false, reason: 'empty' });
          return;
        }
        await setRollbackMode(true);
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach((c) => {
          try { c.navigate(c.url); } catch (_) {}
        });
        if (e.ports && e.ports[0]) e.ports[0].postMessage({ ok: true });
      })()
    );
  }
  if (data && data.type === 'CLEAR_ROLLBACK') {
    e.waitUntil(setRollbackMode(false));
  }
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== ROLLBACK_CACHE && k !== META_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    e.respondWith(
      (async () => {
        if (await isRollbackMode()) {
          const rb = await matchFrom(ROLLBACK_CACHE, req);
          if (rb) return rb;
        }
        try {
          const res = await fetch(req);
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', clone));
          return res;
        } catch (_) {
          return (
            (await matchFrom(CACHE_NAME, req)) ||
            (await matchFrom(ROLLBACK_CACHE, req)) ||
            Response.error()
          );
        }
      })()
    );
    return;
  }

  e.respondWith(
    (async () => {
      if (await isRollbackMode()) {
        const rb = await caches.open(ROLLBACK_CACHE);
        const rbHit = await rb.match(req);
        if (rbHit) return rbHit;
      }
      const live = await caches.open(CACHE_NAME);
      const cached = await live.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) {
          const clone = res.clone();
          live.put(req, clone).catch(() => {});
        }
        return res;
      } catch (_) {
        return cached;
      }
    })()
  );
});
