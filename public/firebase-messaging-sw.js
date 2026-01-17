/**
 * Firebase Cloud Messaging 서비스 워커
 *
 * FCM 서비스 세팅 후 아래 주석을 해제하고 환경변수를 설정하세요.
 * 현재는 비활성화 상태입니다.
 */

// FCM 서비스 세팅 후 아래 주석 해제
// importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
// importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase 설정 (실제 값으로 교체 필요)
// const firebaseConfig = {
//   apiKey: 'YOUR_API_KEY',
//   authDomain: 'YOUR_AUTH_DOMAIN',
//   projectId: 'YOUR_PROJECT_ID',
//   messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
//   appId: 'YOUR_APP_ID',
// };

// firebase.initializeApp(firebaseConfig);

// const messaging = firebase.messaging();

// 백그라운드 메시지 핸들러
// messaging.onBackgroundMessage((payload) => {
//   console.log('[FCM SW] 백그라운드 메시지 수신:', payload);

//   const notificationTitle = payload.notification?.title || '새로핌ON';
//   const notificationOptions = {
//     body: payload.notification?.body || '',
//     icon: '/icon-192x192.png',
//     badge: '/icon-192x192.png',
//     vibrate: [100, 50, 100],
//     data: {
//       url: payload.data?.url || '/',
//     },
//     actions: [
//       {
//         action: 'open',
//         title: '열기',
//       },
//       {
//         action: 'close',
//         title: '닫기',
//       },
//     ],
//   };

//   return self.registration.showNotification(
//     notificationTitle,
//     notificationOptions
//   );
// });

// 알림 클릭 핸들러
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || '/';

  if (action === 'close') {
    return;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // 이미 열려있는 창이 있으면 포커스
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // 없으면 새 창 열기
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

console.log('[FCM SW] Firebase Messaging 서비스 워커 로드됨 (비활성화 상태)');
