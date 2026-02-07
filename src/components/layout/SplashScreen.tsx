'use client';

import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { splashManager } from '@/lib/splash-manager';

const FADE_OUT_MS = 500;

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dismissedRef = useRef(false);
  const mountTimeRef = useRef(Date.now());

  // 페이드 인 애니메이션
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsShowing(true);
    }, 50);

    return () => clearTimeout(showTimer);
  }, []);

  // 앱 준비 상태 구독 + safety timeout
  useEffect(() => {
    let fadeTimer: NodeJS.Timeout;

    const isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - iOS Safari standalone 속성
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    const minDisplayTime = isPWA ? 800 : 500;
    const maxDisplayTime = 2500;

    const hideSplash = () => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;

      // 최소 표시 시간 보장
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, minDisplayTime - elapsed);

      setTimeout(() => {
        setIsFading(true);
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
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-all duration-500 ${
        !isShowing ? 'opacity-0' : isFading ? 'opacity-0' : 'opacity-100'
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
            width={512}
            height={512}
            className="h-48 w-48 object-contain md:h-64 md:w-64"
            onError={() => setImageError(true)}
            unoptimized={process.env.NODE_ENV === 'production'}
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
