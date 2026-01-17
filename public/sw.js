// Service Worker for SeraphimON PWA
const CACHE_NAME = 'seraphimon-v1';
const STATIC_CACHE_NAME = 'seraphimon-static-v1';

// 앱 셸에 필수적인 정적 자원만 프리캐시
const PRECACHE_URLS = [
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // 즉시 활성화
  );
});

// Service Worker 활성화 - 오래된 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME
            );
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim()) // 모든 클라이언트 제어
  );
});

// Fetch 이벤트 핸들링 - Cache-First 전략 (정적 자원만)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 같은 origin의 정적 자원만 캐싱 처리
  if (url.origin === self.location.origin) {
    // 이미지, 아이콘 등 정적 자원
    if (
      request.destination === 'image' ||
      url.pathname.startsWith('/icon-')
    ) {
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            // 성공적인 응답만 캐시
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
      );
      return;
    }
  }

  // 나머지 요청은 네트워크 우선
  event.respondWith(fetch(request));
});

// 푸시 알림 수신 (향후 FCM 연동용)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '새로핌ON', options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // 이미 열려있는 창이 있으면 포커스
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // 없으면 새 창 열기
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
