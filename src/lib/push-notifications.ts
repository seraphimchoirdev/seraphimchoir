/**
 * 웹푸시(Web Push, VAPID) 클라이언트 유틸리티
 *
 * 표준 Push API(pushManager.subscribe)로 브라우저 구독을 생성하고
 * /api/push/subscriptions에 저장한다. 수신은 public/sw.js의 push 핸들러가 처리.
 */

/** VAPID 공개 키(base64url)를 applicationServerKey용 Uint8Array로 변환 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * 웹푸시 구독 생성 + 서버 저장
 * Notification 권한이 'granted'인 상태에서 호출해야 한다.
 *
 * @returns 구독 성공 여부
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY가 설정되지 않았습니다.');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      }));

    const response = await fetch('/api/push/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[Push] 웹푸시 구독 실패:', error);
    return false;
  }
}

/**
 * 웹푸시 구독 해지 (브라우저 구독 취소 + 서버 삭제)
 * 알림 비활성화 시 호출한다.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    const response = await fetch('/api/push/subscriptions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });

    return response.ok;
  } catch (error) {
    console.error('[Push] 웹푸시 구독 해지 실패:', error);
    return false;
  }
}

/** 현재 브라우저에 활성 푸시 구독이 있는지 확인 */
export async function hasActivePushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * 푸시 알림 지원 여부 확인
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
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
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  return version >= 16 && isStandalone;
}
