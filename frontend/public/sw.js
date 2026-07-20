/* Mamascript service worker — minimal app-shell cache.
 *
 * Strategy:
 *   - precache: nothing (CRA hashes filenames; trying to precache the build is fragile).
 *   - runtime navigations: network-first, fallback to cached previous response so the app
 *     still opens when the phone is offline.
 *   - same-origin GETs to /static/* (CRA chunks) + fonts: stale-while-revalidate so the
 *     app shell loads instantly on repeat opens.
 *   - API calls (/api/*) and audio/image streaming endpoints: always network. The data
 *     should never be served stale from cache.
 *
 * Versioning:
 *   bump CACHE_NAME's suffix to invalidate older caches when shipping new shell behaviour.
 */

const CACHE_NAME = "mamascript-v1";

const FONT_HOSTS = new Set([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
]);

// Should this request be cached/served from cache?
function isCacheable(request, url) {
  if (request.method !== "GET") return false;
  // Never touch API routes or audio/image streaming endpoints.
  if (url.pathname.startsWith("/api/")) return false;
  // Same-origin static chunks + assets in /public:
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/static/")) return true;
    if (/\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|otf|css|js)$/i.test(url.pathname)) return true;
    if (url.pathname === "/manifest.json") return true;
    return false;
  }
  // Google Fonts:
  if (FONT_HOSTS.has(url.hostname)) return true;
  return false;
}

self.addEventListener("install", (event) => {
  // Take over right away on a fresh install.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1) Page navigations: network-first, fall back to cached HTML if offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put("/__shell__", fresh.clone()).catch(() => {});
          return fresh;
        } catch (_err) {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match("/__shell__");
          if (cached) return cached;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Mamascript — offline</title>' +
              '<body style="font-family:system-ui;padding:40px;background:#FDFBF7;color:#2C302B">' +
              '<h1 style="font-family:Merienda,serif">You\'re offline</h1>' +
              '<p>Mamascript needs the internet to load the family vault. Try again when you\'re back online.</p>',
            { headers: { "Content-Type": "text/html" } }
          );
        }
      })()
    );
    return;
  }

  // 2) Static assets + fonts: stale-while-revalidate.
  if (isCacheable(request, url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone()).catch(() => {});
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })()
    );
    return;
  }

  // 3) Everything else (incl. /api/*): pass through.
});
