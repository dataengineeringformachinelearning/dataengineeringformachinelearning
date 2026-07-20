const CACHE_NAME = 'deml-cache-v7';
const BYPASS_PATH_PREFIXES = ['/auth-status'];
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
];

// --- Helpers ---
function isHashedBundle(pathname) {
  return /\/(?:chunk|main|polyfills|styles)-[^/]+\.(?:js|css)$/i.test(pathname);
}

function isStaticAssetPath(pathname) {
  return /\.(?:js|mjs|css|woff2?|png|jpe?g|gif|svg|webp|ico|json|webmanifest|map)$/i.test(pathname);
}

function isCacheableAssetResponse(response, pathname) {
  if (!response || response.status !== 200 || response.type !== 'basic') {
    return false;
  }
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  // SPA fallback HTML must never be stored as a JS/CSS asset URL.
  if (contentType.includes('text/html')) {
    return false;
  }
  if (/\.(?:js|mjs)$/i.test(pathname)) {
    return contentType.includes('javascript') || contentType.includes('ecmascript');
  }
  if (/\.css$/i.test(pathname)) {
    return contentType.includes('text/css');
  }
  return isStaticAssetPath(pathname);
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => {
          return fetch(url)
            .then(response => {
              if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
              }
              return cache.put(url, response);
            })
            .catch(error => {
              console.warn('[Service Worker] Failed to cache asset:', url, error);
            });
        }),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only handle HTTP/HTTPS (ignore chrome-extension://, etc.)
  if (!event.request.url.startsWith('http')) return;

  // Only handle same-origin requests to prevent CORS issues with third-party APIs
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Do not handle/intercept API requests, auth iframe, or non-GET requests
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;
  if (BYPASS_PATH_PREFIXES.some(prefix => requestUrl.pathname.startsWith(prefix))) return;

  // Network-First strategy for HTML navigation requests (index.html)
  if (
    event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          }
          return caches.match(event.request).then(cached => cached || networkResponse);
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match('/index.html');
        }),
    );
    return;
  }

  // Hashed Angular bundles: network-only. Never serve/cache SPA HTML under chunk URLs.
  if (isHashedBundle(requestUrl.pathname)) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        if (isCacheableAssetResponse(networkResponse, requestUrl.pathname)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }),
    );
    return;
  }

  // Cache-First (Stale-While-Revalidate) for other static assets
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const networkFetch = fetch(event.request)
        .then(networkResponse => {
          if (isCacheableAssetResponse(networkResponse, requestUrl.pathname)) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      if (cachedResponse) {
        const cachedType = (cachedResponse.headers.get('content-type') || '').toLowerCase();
        // Drop poisoned HTML entries previously stored under asset URLs.
        if (cachedType.includes('text/html') && isStaticAssetPath(requestUrl.pathname)) {
          caches.open(CACHE_NAME).then(cache => cache.delete(event.request));
          return networkFetch;
        }
        void networkFetch.catch(() => {});
        return cachedResponse;
      }

      return networkFetch;
    }),
  );
});
