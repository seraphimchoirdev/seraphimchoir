'use client';

import { useEffect, useRef } from 'react';

interface ServiceWorkerRegistrationProps {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
}

export function ServiceWorkerRegistration({ onUpdate, onSuccess }: ServiceWorkerRegistrationProps) {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        registrationRef.current = registration;

        // 새 서비스 워커가 설치됨 (업데이트)
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // 새 버전 사용 가능 - 업데이트 콜백 호출
                console.log('[SW] 새 버전이 사용 가능합니다.');
                onUpdate?.(registration);
              } else {
                // 최초 설치 완료
                console.log('[SW] 서비스 워커가 설치되었습니다.');
                onSuccess?.(registration);
              }
            }
          };
        };

        // 이미 활성화된 서비스 워커가 있는 경우
        if (registration.active) {
          console.log('[SW] 서비스 워커가 활성화되어 있습니다.');
        }
      } catch (error) {
        console.error('[SW] 서비스 워커 등록 실패:', error);
      }
    };

    registerServiceWorker();

    // 페이지가 서비스 워커에 의해 제어될 때
    const handleControllerChange = () => {
      console.log('[SW] 새 서비스 워커가 제어를 시작했습니다.');
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [onUpdate, onSuccess]);

  return null;
}

// 서비스 워커 업데이트 적용 함수
export function applyServiceWorkerUpdate(registration: ServiceWorkerRegistration) {
  const waitingWorker = registration.waiting;
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}
