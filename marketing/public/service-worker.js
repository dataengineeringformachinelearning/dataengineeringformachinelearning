const CACHE_NAME = "deml-cache-v4";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/site.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/assets/content/page.md",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => {
          return fetch(url)
            .then((response) => {
              if (!response.ok) {
                throw new Error(
                  `Request failed with status ${response.status}`,
                );
              }
              return cache.put(url, response);
            })
            .catch((error) => {
              console.warn(
                "[Service Worker] Failed to cache asset:",
                url,
                error,
              );
            });
        }),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle HTTP/HTTPS (ignore chrome-extension://, etc.)
  if (!event.request.url.startsWith("http")) return;

  // Only handle same-origin requests to prevent CORS issues with third-party APIs
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Do not handle/intercept API requests or non-GET requests
  if (event.request.method !== "GET" || event.request.url.includes("/api/"))
    return;

  // Network-First strategy for HTML navigation requests (index.html)
  if (
    event.request.mode === "navigate" ||
    event.request.headers.get("accept").includes("text/html")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          }
          return caches
            .match(event.request)
            .then((cached) => cached || networkResponse);
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match("/index.html");
        }),
    );
    return;
  }

  // Cache-First (Stale-While-Revalidate) for static assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response, fetch new version in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          throw error;
        });
    }),
  );
});
