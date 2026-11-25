/**
 * SiteForge Service Worker (sw.js)
 * Pre-caches every local app file on install in a versioned cache (siteforge-v3),
 * ensures stylesheets are always fetched & served as valid text/css (never JS wrappers),
 * uses network-first with instant offline cache fallback, and deletes stale caches on activate.
 */

const CACHE_NAME = 'siteforge-v6';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './options.js',
  './layouts.js',
  './themes.js',
  './icons.js',
  './validators.js',
  './zip.js',
  './i18n.js',
  './storage.js',
  './qr.js',
  './image-studio.js',
  './health.js',
  './copy-bank.js',
  './selftest.js',
  './features-ui.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
];

function isMimeCompatible(request, response) {
  if (!response) return false;
  const ct = (response.headers.get('content-type') || '').toLowerCase();
  const urlPath = new URL(request.url).pathname;
  if (request.destination === 'style' || urlPath.endsWith('.css')) {
    return ct.includes('text/css');
  }
  if (request.destination === 'script' || urlPath.endsWith('.js')) {
    return ct.includes('javascript') || ct.includes('ecmascript');
  }
  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await Promise.all(
          PRECACHE_ASSETS.map(async (asset) => {
            const headers = asset.endsWith('.css')
              ? { Accept: 'text/css,*/*;q=0.1' }
              : undefined;
            const req = new Request(asset, { cache: 'reload', headers });
            const res = await fetch(req);
            if (res && res.ok && isMimeCompatible(req, res)) {
              await cache.put(asset, res);
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: 'SITEFORGE_OFFLINE_READY', cache: CACHE_NAME });
          }
        })
      )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/@vite') || url.pathname.startsWith('/@fs')) return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          isMimeCompatible(request, networkResponse)
        ) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached && isMimeCompatible(request, cached)) {
          return cached;
        }
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      })
  );
});
