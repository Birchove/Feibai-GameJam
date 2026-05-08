const CACHE_VERSION = "feibai-v1";
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/core/utils.js",
  "./js/core/state.js",
  "./js/core/audio.js",
  "./js/core/preload.js",
  "./js/data/constants.js",
  "./js/data/classes.js",
  "./js/data/cards.js",
  "./js/data/poetry.js",
  "./js/data/items.js",
  "./js/data/enemies.js",
  "./js/data/events.js",
  "./js/systems/game.js",
  "./js/systems/combat.js",
  "./js/systems/settlement.js",
  "./js/systems/map.js",
  "./js/systems/fx.js",
  "./js/systems/dev.js",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isHttpRequest(request) {
  return request.url.startsWith("http://") || request.url.startsWith("https://");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isHttpRequest(request)) return;

  const isAppShell =
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "document";

  if (isAppShell) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});
