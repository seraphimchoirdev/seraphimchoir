import { useSyncExternalStore } from 'react';

// 빈 subscribe 함수 (클라이언트 상태는 변경되지 않음)
const emptySubscribe = () => () => {};

// 클라이언트에서는 항상 true 반환
const getClientSnapshot = () => true;

// 서버에서는 항상 false 반환
const getServerSnapshot = () => false;

/**
 * SSR 하이드레이션을 위한 마운트 상태 추적 훅
 * React 19의 useSyncExternalStore를 사용하여 SSR/CSR 상태를 안전하게 처리
 */
export function useMounted() {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}
