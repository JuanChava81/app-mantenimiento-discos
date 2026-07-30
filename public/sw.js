const CACHE_NAME = "mantenimiento-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Solo cacheamos assets estáticos (JS/CSS/íconos). El HTML y los datos de
// Supabase siempre van a la red, para no mostrar información vieja.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

  if (!isStaticAsset || event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
  );
});
