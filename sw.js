const CACHE_NAME = 'note-log-shell-v3';
const APP_SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// バージョン固定・変化しない外部資産（Firebase SDK / Webフォント）は端末に保存して即時表示する
const STATIC_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// キャッシュがあれば即返し、裏で最新を取得して次回起動に反映する（stale-while-revalidate）。
// 起動のたびにネットワーク応答を待つ必要がなくなり、オフラインでも開ける。
function staleWhileRevalidate(event) {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((response) => {
            if (response && (response.ok || response.type === 'opaque')) {
              cache.put(event.request, response.clone()).catch(() => {});
            }
            return response;
          })
          .catch(() => cached);
        if (cached) {
          event.waitUntil(network.catch(() => {}));
          return cached;
        }
        return network;
      })
    )
  );
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  // Firebase通信・認証など上記以外の外部リクエストは一切介入しない
  if (!sameOrigin && !STATIC_HOSTS.includes(url.hostname)) return;
  staleWhileRevalidate(event);
});
