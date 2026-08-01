const CACHE_NAME = 'mehfil-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/mehfil-logo.png',
  '/favicon.ico',
  '/dp.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Pre-caching static assets...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle HTTP/HTTPS requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. Pass external origin media (audio CDN streams, Saavn CDN, external APIs) directly to browser
  if (url.origin !== self.location.origin) {
    return; // Don't call respondWith — let browser perform direct native fetch & media streaming
  }

  // 2. Pass local API requests directly to network
  if (url.pathname.startsWith('/api/')) {
    return; // Don't call respondWith — let native fetch handle it
  }

  // 3. Navigation requests (HTML pages) -> Network First, falling back to cached index.html
  if (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedHtml = (await caches.match('/index.html')) || (await caches.match('/'));
          return cachedHtml || new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // 4. Static UI assets (JS, CSS, local images) -> Cache First, falling back to network
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          return new Response('Asset Unavailable', { status: 404 });
        });
      })
    );
  }
});
