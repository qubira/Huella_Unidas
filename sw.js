/* ===================================================
   HUELLAS UNIDAS — Service Worker
   Cachea el "shell" estático para que el sitio cargue
   más rápido y funcione parcialmente sin conexión.
=================================================== */
const CACHE_NAME = 'huellas-unidas-v2';
const CORE_ASSETS = [
  'index.html', 'mascotas.html', 'mapa.html', 'adopcion.html', 'estadisticas.html',
  'detalle.html', 'reportar-perdida.html', 'reportar-encontrada.html', 'admin.html', 'mensajes.html',
  'css/style.css',
  'js/api.js', 'js/main.js', 'js/forms.js', 'js/listing.js',
  'js/detail.js', 'js/adoption.js', 'js/map.js', 'js/stats.js', 'js/admin.js',
  'manifest.json', 'icons/icon.svg', 'img/logo_huellas-unidas.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return; // deja pasar CDNs externos (Leaflet, Chart.js, fuentes)

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response && response.ok){
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
