const CACHE_NAME = 'mehfil-v3';
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
      console.log('Pre-caching assets...');
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

  // Only handle HTTP/HTTPS requests (ignores chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip caching for external music/API streams, use Network First
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Skip caching for local API requests (they are dynamic and shouldn't be cached)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // 1. Navigation requests (HTML pages) -> Network First, falling back to cache
  if (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // If offline, fallback to cached index.html
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 2. Static UI assets (JS, CSS, local images, fonts) -> Cache First, falling back to network
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  } else {
    // Pass other methods (POST, PUT, DELETE, etc.) directly to the network
    event.respondWith(fetch(request));
  }
});
