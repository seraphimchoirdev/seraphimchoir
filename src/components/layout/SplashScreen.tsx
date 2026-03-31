'use client';

import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { splashManager } from '@/lib/splash-manager';

const FADE_OUT_MS = 500;
const SESSION_KEY = 'seraphim-splash-shown';

export default function SplashScreen() {
  // 세션 내 반복 방문 시 스플래시를 스킵
  const alreadyShown = typeof window !== 'undefined' &&
    (sessionStorage.getItem(SESSION_KEY) === '1' || splashManager.getIsSplashDismissed());

  const [isVisible, setIsVisible] = useState(!alreadyShown);
  const [isFading, setIsFading] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dismissedRef = useRef(alreadyShown);
  const mountTimeRef = useRef(Date.now());

  // 이미 표시했다면 즉시 splashManager에 완료 알림
  useEffect(() => {
    if (alreadyShown) {
      splashManager.setAppReady();
      splashManager.setSplashDismissed();
    }
  }, [alreadyShown]);

  // 페이드 인 애니메이션
  useEffect(() => {
    if (alreadyShown) return;

    const showTimer = setTimeout(() => {
      setIsShowing(true);
    }, 50);

    return () => clearTimeout(showTimer);
  }, [alreadyShown]);

  // 앱 준비 상태 구독 + safety timeout
  useEffect(() => {
    if (alreadyShown) return;

    let fadeTimer: NodeJS.Timeout;

    const isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - iOS Safari standalone 속성
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    const minDisplayTime = isPWA ? 500 : 300;
    const maxDisplayTime = 1500;

    const hideSplash = () => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;

      // 최소 표시 시간 보장
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, minDisplayTime - elapsed);

      setTimeout(() => {
        setIsFading(true);
        // 페이드아웃 시작 즉시 세션에 기록 (네비게이션 중 리마운트 방어)
        try {
          sessionStorage.setItem(SESSION_KEY, '1');
        } catch {
          // sessionStorage 사용 불가한 환경 무시
        }
        fadeTimer = setTimeout(() => {
          setIsVisible(false);
          splashManager.setSplashDismissed();
        }, FADE_OUT_MS);
      }, remaining);
    };

    // AuthProvider에서 setAppReady() 호출 시 즉시 반응
    const unsubscribe = splashManager.onAppReady(hideSplash);

    // safety timeout: 앱이 준비되지 않아도 최대 시간 후 숨김
    const safetyTimer = setTimeout(hideSplash, maxDisplayTime);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [alreadyShown]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-background-primary)] transition-all duration-500 ${
        !isShowing ? 'opacity-0 pointer-events-none' : isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div
        className={`relative flex flex-col items-center transition-transform duration-500 ${
          isShowing ? 'scale-100' : 'scale-95'
        }`}
      >
        {!imageError ? (
          <Image
            src="/icon-512x512.png?v=2"
            alt="새로핌:On"
            width={192}
            height={192}
            className="h-48 w-48 object-contain md:h-64 md:w-64"
            priority
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="text-center">
            <h1 className="mb-2 text-3xl font-bold text-[#4A8FD3]">새로핌:On</h1>
            <p className="text-sm text-gray-500">날마다 새로 피어나는 찬양대</p>
          </div>
        )}
      </div>
    </div>
  );
}
