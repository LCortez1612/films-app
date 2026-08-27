// Service worker de Films
// Subí la versión del cache cada vez que cambies index.html para que
// los dispositivos ya instalados bajen la versión nueva.
const CACHE_VERSION = "films-v3";

const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

// Fuentes de Google Fonts: se cachean aparte porque son de otro origen.
const FONT_URLS = [
  "https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600;700&family=Press+Start+2P&family=VT323&display=swap"
];

const FONT_ORIGINS = new Set([
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com"
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // Cachea el shell propio primero (crítico para que abra offline).
      return cache.addAll(APP_SHELL).then(() => {
        // Las fuentes son best-effort: si no hay red en el install, no rompe nada.
        return Promise.all(
          FONT_URLS.map((url) =>
            fetch(url, { mode: "no-cors" })
              .then((res) => cache.put(url, res))
              .catch(() => {})
          )
        );
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo maneja GET; el resto (si lo hubiera) pasa directo a la red.
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isAppAsset = url.origin === self.location.origin;
  const isFontAsset = FONT_ORIGINS.has(url.origin);

  // Las APIs de películas no se guardan: las URLs pueden contener claves y las
  // respuestas cambian. El cache queda reservado para la app y sus fuentes.
  if (!isAppAsset && !isFontAsset) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // Estrategia: cache primero, y en paralelo intenta actualizar el cache
      // desde la red para la próxima vez (stale-while-revalidate).
      const networkFetch = fetch(req)
        .then((res) => {
          // Las fuentes cross-origin devuelven respuestas opaque (status 0),
          // que también son válidas para Cache Storage.
          if (res && (res.ok || res.type === "opaque")) {
            const resClone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached || Response.error());

      return cached || networkFetch;
    })
  );
});
