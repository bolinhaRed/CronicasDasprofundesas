/* Service worker: tudo em cache para jogar sem internet. Muda a VERSAO quando actualizares ficheiros. */
const VERSAO = 'cronicas-v1.0.0';
const FICHEIROS = [
  './', './index.html', './manifest.webmanifest', './css/estilo.css',
  './js/core/base.js', './js/data/regras.js', './js/data/masmorras.js', './js/data/missoes.js',
  './js/core/masmorra.js', './js/core/parser.js', './js/core/motor.js', './js/ui/app.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(FICHEIROS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const cp = res.clone(); caches.open(VERSAO).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
