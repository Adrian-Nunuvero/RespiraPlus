const CACHE_NAME = 'respiraplus-v9.9.0-vibrant-mesh';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css?v=9.9.0',
  '/js/api.js?v=9.9.0',
  '/js/app.js?v=9.9.0',
  '/js/sw-register.js?v=9.9.0',
  '/manifest.json'
];

// Install Event - skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching v3.1.0 assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate Event - purge all old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First for everything so live updates are instant, Fallback to cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.url.includes('/api/')) {
            return new Response(JSON.stringify({ offline: true, error: 'Sin conexión a internet' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return caches.match('/');
        });
      })
  );
});
