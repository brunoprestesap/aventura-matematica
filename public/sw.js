const CACHE_NAME = "continha-magica-v3";
const OFFLINE_URL = "/";
const PRECACHE_ASSETS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // Navegações (documentos HTML): network-first.
  // Servir o shell em cache (cache-first) desatualiza a página: no dev, o
  // HMR do Next detecta a divergência de build e recarrega em loop; em
  // produção, mantém um shell antigo após um novo deploy. Buscamos sempre da
  // rede e só caímos no cache em modo offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached || Response.error())
      )
    );
    return;
  }

  // Demais assets (js, css, imagens, fontes): cache-first com atualização.
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          const requestUrl = new URL(request.url);
          if (
            response.status === 200 &&
            (requestUrl.origin === self.location.origin ||
              requestUrl.pathname.match(/\.(js|css|png|svg|ico|woff2?)$/)) &&
            !requestUrl.pathname.startsWith("/_next/data")
          ) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cloned);
            });
          }
          return response;
        })
      );
    })
  );
});
