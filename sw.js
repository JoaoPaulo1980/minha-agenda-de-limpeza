// Deixa o aplicativo abrir mesmo sem internet. Os dados NÃO passam por aqui: ficam no próprio celular.
// Estratégia: tenta a internet primeiro (assim as atualizações chegam logo) e, se falhar, usa a cópia guardada.
const VERSAO = 'agenda-v1';
const ARQUIVOS = [
  './', 'index.html', 'estilos.css', 'manifest.webmanifest', 'icons/icone.svg',
  'js/app.js', 'js/armazem.js', 'js/calculos.js', 'js/datas.js', 'js/demo.js', 'js/dinheiro.js',
  'js/estado.js', 'js/folhas.js', 'js/modelo.js', 'js/recorrencia.js', 'js/telas.js', 'js/visual.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      const copia = res.clone();
      if (res.ok) caches.open(VERSAO).then((c) => c.put(req, copia));
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('index.html'))),
  );
});
