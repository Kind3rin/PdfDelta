importScripts('./vendor/pdfjs-assets.js');
const CACHE_PREFIX = "pdfdelta-static-";
const CACHE_NAME = `${CACHE_PREFIX}v39`;
const ASSETS = [
  "./",
  "./index.html",
  "./privacy.html",
  "./styles.css",
  "./app.js",
  "./tool-catalog.mjs",
  "./bootstrap.mjs",
  "./pdf-engine.mjs",
  "./workspace.mjs",
  "./workspace-model.mjs",
  "./workspace.css",
  "./vendor/pdfjs-assets.js",
  "./manifest.webmanifest",
  "./README.md",
  "./FREE_BACKEND_STRATEGY.md",
  "./vendor/pdf-lib.min.js",
  "./vendor/jszip.min.js",
  "./vendor/qrcode-generator.js",
  "./vendor/THIRD_PARTY.md",
  ...self.PDFJS_ASSETS,
];
const ASSET_URLS = new Set(ASSETS.map((asset) => new URL(asset, self.registration.scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Cache only the application shell, never documents or other applications.
  if (!ASSET_URLS.has(event.request.url)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      // Keep each deployed shell coherent: activation switches the entire version.
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.status === 200 && response.type === "basic" && !response.redirected) {
          try {
            await cache.put(event.request, response.clone());
          } catch {
            // Storage quota must not prevent an online response from being served.
          }
        }
        return response;
      } catch {
        return new Response("Risorsa non disponibile offline. Riconnettiti e riprova.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })()
  );
});
