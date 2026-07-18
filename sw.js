/* 网络优先 + 2 秒超时 + 缓存兜底。
   有网 → 永远拿最新的,你不用改版本号。
   没网 → fetch 立刻失败,直接落缓存,秒开。 */
const CACHE = 'pos-drill';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  e.respondWith(
    Promise.race([
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 2000))
    ]).catch(() =>
      caches.match(req).then(hit =>
        hit || caches.match('./index.html') ||
        new Response('离线且无缓存', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      )
    )
  );
});
