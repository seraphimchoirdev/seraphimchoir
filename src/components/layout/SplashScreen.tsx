'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { splashManager } from '@/lib/splash-manager';

export default function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true);
    const [isFading, setIsFading] = useState(false);
    const [isShowing, setIsShowing] = useState(false); // 페이드 인용
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // 페이드 인 애니메이션
    useEffect(() => {
        const showTimer = setTimeout(() => {
            setIsShowing(true);
        }, 50); // 약간의 딜레이 후 페이드 인 시작

        return () => clearTimeout(showTimer);
    }, []);

    useEffect(() => {
        let minDisplayTimer: NodeJS.Timeout;
        let maxDisplayTimer: NodeJS.Timeout;
        let fadeTimer: NodeJS.Timeout;

        // PWA 환경 감지 (표시 시간 조절용)
        const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                      // @ts-ignore - iOS Safari
                      window.navigator.standalone === true ||
                      document.referrer.includes('android-app://');

        // PWA는 더 길게, 웹은 기본 시간
        const minDisplayTime = isPWA ? 2500 : 1500;  // PWA: 2.5초, 웹: 1.5초
        const maxDisplayTime = isPWA ? 4500 : 3000;  // PWA: 4.5초, 웹: 3초

        const hideSplash = () => {
            setIsFading(true);
            fadeTimer = setTimeout(() => {
                setIsVisible(false);
                // 스플래시가 숨겨진 후 앱이 준비됨을 알림
                splashManager.setAppReady();
            }, 800); // 페이드 아웃 시간 증가 (더 부드러운 전환)
        };

        // 최소 표시 시간 후 이미지가 로드되었거나 에러가 발생했으면 숨김
        minDisplayTimer = setTimeout(() => {
            if (imageLoaded || imageError) {
                hideSplash();
            }
        }, minDisplayTime);

        // 최대 표시 시간 후에는 무조건 숨김 (fallback)
        maxDisplayTimer = setTimeout(() => {
            hideSplash();
        }, maxDisplayTime);

        // 페이지가 완전히 로드되면 스플래시 숨김
        const handlePageLoad = () => {
            if (document.readyState === 'complete') {
                // 페이지가 완전히 로드되면 즉시 스플래시를 숨김
                if (imageLoaded || imageError || Date.now() - pageLoadStartTime > 2000) {
                    hideSplash();
                }
            }
        };

        const pageLoadStartTime = Date.now();

        // 이미 페이지가 로드된 경우
        if (document.readyState === 'complete') {
            handlePageLoad();
        } else {
            window.addEventListener('load', handlePageLoad);
        }

        return () => {
            clearTimeout(minDisplayTimer);
            clearTimeout(maxDisplayTimer);
            clearTimeout(fadeTimer);
            window.removeEventListener('load', handlePageLoad);
        };
    }, [imageLoaded, imageError]);

    // 이미지 로드 완료 처리
    const handleImageLoad = () => {
        setImageLoaded(true);
    };

    // 이미지 로드 에러 처리
    const handleImageError = () => {
        setImageError(true);
        console.error('Failed to load splash screen image');
    };

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-all duration-700 ${
                !isShowing ? 'opacity-0' : isFading ? 'opacity-0' : 'opacity-100'
            }`}
        >
            <div className={`relative flex flex-col items-center transition-transform duration-700 ${
                isShowing ? 'scale-100' : 'scale-95'
            }`}>
                {!imageError ? (
                    <Image
                        src="/logo_seraphim_on.png"
                        alt="새로핌:On"
                        width={879}
                        height={368}
                        className="w-48 h-auto object-contain md:w-64"
                        priority
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        unoptimized={process.env.NODE_ENV === 'production'}
                    />
                ) : (
                    // Fallback UI when image fails to load
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-[#4A8FD3] mb-2">새로핌:On</h1>
                        <p className="text-gray-500 text-sm">날마다 새로 피어나는 찬양대</p>
                    </div>
                )}
            </div>
        </div>
    );
}
