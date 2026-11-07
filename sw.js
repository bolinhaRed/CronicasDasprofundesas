/* Service worker: tudo em cache para jogar sem internet. Muda a VERSAO quando actualizares ficheiros. */
const VERSAO = 'cronicas-v1.3.0';
const FICHEIROS = [
  './', './index.html', './manifest.webmanifest', './css/estilo.css',
  './js/core/base.js', './js/data/regras.js', './js/data/arte.js', './js/data/masmorras.js', './assets/retratos.png', './assets/objectos.png', './js/data/missoes.js',
  './js/core/masmorra.js', './js/core/parser.js', './js/core/motor.js', './js/ui/som.js', './js/ui/mapa.js', './audio/musica.mp3', './js/ui/app.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(FICHEIROS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const range = e.request.headers.get('range');
  if (range) {
    // música: responder a pedidos parciais a partir da cache (necessário no Safari, sem internet)
    e.respondWith(caches.match(e.request.url, { ignoreSearch: true }).then(r => {
      if (!r) return fetch(e.request);
      return r.arrayBuffer().then(buf => {
        const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
        const ini = m[1] ? parseInt(m[1], 10) : 0;
        const fim = m[2] ? parseInt(m[2], 10) : buf.byteLength - 1;
        return new Response(buf.slice(ini, fim + 1), { status: 206, headers: { 'Content-Type': r.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${ini}-${fim}/${buf.byteLength}`, 'Content-Length': String(fim - ini + 1), 'Accept-Ranges': 'bytes' } });
      });
    }));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const cp = res.clone(); caches.open(VERSAO).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
