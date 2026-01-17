/**
 * 푸시 알림 유틸리티
 *
 * FCM 서비스 세팅 후 실제 연동을 위해 주석 해제하세요.
 * 현재는 준비 코드만 포함되어 있습니다.
 */

// import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
// import { getFirebaseMessaging, vapidKey } from './firebase';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, string>;
}

/**
 * FCM 토큰 발급
 * 푸시 알림 권한이 승인된 후 호출합니다.
 *
 * @returns FCM 토큰 또는 null
 */
export async function requestFCMToken(): Promise<string | null> {
  // FCM 서비스 세팅 후 주석 해제

  // const messaging = getFirebaseMessaging();
  // if (!messaging) {
  //   console.warn('[Push] Firebase Messaging이 초기화되지 않았습니다.');
  //   return null;
  // }

  // try {
  //   // 서비스 워커 등록 확인
  //   const registration = await navigator.serviceWorker.ready;

  //   const token = await getToken(messaging, {
  //     vapidKey,
  //     serviceWorkerRegistration: registration,
  //   });

  //   if (token) {
  //     console.log('[Push] FCM 토큰 발급 성공');
  //     // TODO: 서버에 토큰 저장
  //     // await saveTokenToServer(token);
  //     return token;
  //   } else {
  //     console.warn('[Push] FCM 토큰을 가져올 수 없습니다.');
  //     return null;
  //   }
  // } catch (error) {
  //   console.error('[Push] FCM 토큰 발급 실패:', error);
  //   return null;
  // }

  console.log('[Push] FCM 연동이 아직 설정되지 않았습니다.');
  return null;
}

/**
 * 포그라운드 메시지 리스너 설정
 * 앱이 활성화된 상태에서 푸시를 받을 때 호출됩니다.
 *
 * @param callback 메시지 수신 시 호출될 콜백
 * @returns 구독 해제 함수
 */
export function onForegroundMessage(
  callback: (payload: PushNotificationPayload) => void
): () => void {
  // FCM 서비스 세팅 후 주석 해제

  // const messaging = getFirebaseMessaging();
  // if (!messaging) {
  //   return () => {};
  // }

  // return onMessage(messaging, (payload: MessagePayload) => {
  //   console.log('[Push] 포그라운드 메시지 수신:', payload);

  //   const notification: PushNotificationPayload = {
  //     title: payload.notification?.title || '새로핌On',
  //     body: payload.notification?.body || '',
  //     icon: payload.notification?.icon || '/icon-192x192.png',
  //     url: payload.data?.url || '/',
  //     data: payload.data,
  //   };

  //   callback(notification);
  // });

  console.log('[Push] FCM 포그라운드 리스너가 아직 설정되지 않았습니다.');
  return () => {};
}

/**
 * FCM 토큰을 서버에 저장
 * Supabase에 토큰을 저장하여 서버에서 푸시를 보낼 수 있게 합니다.
 *
 * @param token FCM 토큰
 * @param userId 사용자 ID (선택)
 */
export async function saveTokenToServer(
  token: string,
  userId?: string
): Promise<boolean> {
  // TODO: Supabase에 토큰 저장 구현
  // 필요한 테이블 스키마:
  // CREATE TABLE push_subscriptions (
  //   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  //   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  //   token TEXT NOT NULL UNIQUE,
  //   device_type TEXT,
  //   created_at TIMESTAMPTZ DEFAULT NOW(),
  //   updated_at TIMESTAMPTZ DEFAULT NOW()
  // );

  console.log('[Push] 토큰 저장 (미구현):', { token: token.slice(0, 20) + '...', userId });
  return false;
}

/**
 * FCM 토큰을 서버에서 삭제
 * 로그아웃 또는 알림 비활성화 시 호출합니다.
 *
 * @param token FCM 토큰
 */
export async function removeTokenFromServer(token: string): Promise<boolean> {
  // TODO: Supabase에서 토큰 삭제 구현
  console.log('[Push] 토큰 삭제 (미구현):', token.slice(0, 20) + '...');
  return false;
}

/**
 * 푸시 알림 지원 여부 확인
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * 현재 푸시 알림 권한 상태
 */
export function getPushPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) {
    return 'unsupported';
  }

  return Notification.permission;
}

/**
 * iOS PWA에서 푸시 지원 여부 확인
 */
export function isIOSPushSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // iOS 감지
  const iOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream;

  if (!iOS) {
    return true; // iOS가 아니면 일반적으로 지원
  }

  // iOS 버전 확인 (16.4 이상 필요)
  const match = navigator.userAgent.match(/OS (\d+)_/);
  const version = match ? parseInt(match[1], 10) : 0;

  // PWA 모드 확인
  const isStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true ||
    window.matchMedia('(display-mode: standalone)').matches;

  return version >= 16 && isStandalone;
}
