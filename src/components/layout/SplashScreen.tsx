'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { splashManager } from '@/lib/splash-manager';

const FADE_OUT_MS = 300;
const SESSION_KEY = 'seraphim-splash-shown';

export default function SplashScreen() {
  // 세션 내 반복 방문 여부는 마운트 후에만 판정 (렌더 중 sessionStorage를 읽으면
  // 서버/클라이언트 마크업이 달라져 hydration mismatch 발생).
  // null = 미판정, true = 스킵, false = 정상 표시
  const [alreadyShown, setAlreadyShown] = useState<boolean | null>(null);

  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dismissedRef = useRef(false);
  const mountTimeRef = useRef(Date.now());

  // 페인트 전에 스킵 여부 판정 (초기 마크업이 opacity-0이라 깜빡임 없음)
  useLayoutEffect(() => {
    const shown =
      sessionStorage.getItem(SESSION_KEY) === '1' || splashManager.getIsSplashDismissed();
    setAlreadyShown(shown);
    if (shown) {
      dismissedRef.current = true;
      setIsVisible(false);
      splashManager.setAppReady();
      splashManager.setSplashDismissed();
    }
  }, []);

  // 페이드 인 애니메이션
  useEffect(() => {
    if (alreadyShown !== false) return;

    const showTimer = setTimeout(() => {
      setIsShowing(true);
    }, 50);

    return () => clearTimeout(showTimer);
  }, [alreadyShown]);

  // 앱 준비 상태 구독 + safety timeout
  useEffect(() => {
    if (alreadyShown !== false) return;

    let fadeTimer: NodeJS.Timeout;

    const isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - iOS Safari standalone 속성
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    // PWA는 OS 네이티브 스플래시가 선행되므로 커스텀 스플래시는 짧게 (체감 시간 단축)
    const minDisplayTime = isPWA ? 300 : 200;
    const maxDisplayTime = 1000;

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
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-background-primary)] transition-all duration-300 ${
        !isShowing ? 'opacity-0 pointer-events-none' : isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div
        className={`relative flex flex-col items-center transition-transform duration-300 ${
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
