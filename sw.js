/* =========================================================================
   Study Planner Premium — Service Worker
   Menyediakan mode offline dengan strategi cache-first untuk app shell,
   dan stale-while-revalidate untuk aset eksternal (CDN).
   ========================================================================= */

const CACHE_NAME = "study-planner-cache-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./assets/icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/logo.png",
  "./assets/bg.jpg",
  "./favicon.ico",
];

// INSTALL: cache seluruh app shell agar bisa dibuka offline
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

// ACTIVATE: bersihkan cache versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// FETCH: cache-first untuk app shell, network-first (fallback cache) untuk lainnya
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Segarkan cache di belakang layar (stale-while-revalidate)
        fetch(request)
          .then((response) => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            }
          })
          .catch(() => {});
        return cached;
      }

      return fetch(request)
        .then((response) => {
          if (response && response.ok && request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
