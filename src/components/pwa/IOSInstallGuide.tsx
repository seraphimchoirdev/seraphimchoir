'use client';

import { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'ios_install_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7일

interface IOSInstallGuideProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export function IOSInstallGuide({ forceShow, onClose }: IOSInstallGuideProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // iOS 감지
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream;

    // Safari 감지 (iOS에서 Safari만 PWA 설치 지원)
    const isSafari =
      /Safari/.test(navigator.userAgent) &&
      !/CriOS|FxiOS|OPiOS|EdgiOS/.test(navigator.userAgent);

    // Standalone 모드 감지
    const standalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true ||
      window.matchMedia('(display-mode: standalone)').matches;

    setIsIOS(iOS);
    setIsStandalone(standalone);

    // iOS Safari이고 아직 설치 안됨
    if (iOS && isSafari && !standalone) {
      // 이전에 닫았는지 확인
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const dismissedTime = parseInt(dismissedAt, 10);
        if (Date.now() - dismissedTime < DISMISS_DURATION) {
          return;
        }
        localStorage.removeItem(STORAGE_KEY);
      }

      // 약간의 딜레이 후 표시 (UX 개선)
      const timer = setTimeout(() => {
        setShowGuide(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowGuide(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    onClose?.();
  };

  const shouldShow = forceShow || (showGuide && isIOS && !isStandalone);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-[var(--color-background-secondary)] rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--color-text-primary)]">
                새로핌:On 설치하기
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                홈 화면에서 바로 실행하세요
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-full hover:bg-[var(--color-background-tertiary)] transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-[var(--color-text-tertiary)]" />
          </button>
        </div>

        {/* 설치 단계 */}
        <div className="p-4 space-y-4">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--color-text-primary)]">
                  공유 버튼을 탭하세요
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Safari 하단의{' '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--color-background-tertiary)] rounded">
                  <Share className="w-4 h-4" />
                </span>{' '}
                버튼을 탭하세요
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--color-text-primary)]">
                  &quot;홈 화면에 추가&quot;를 선택하세요
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                메뉴에서{' '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--color-background-tertiary)] rounded">
                  <PlusSquare className="w-4 h-4" />
                  홈 화면에 추가
                </span>
                를 찾아 탭하세요
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--color-text-primary)]">
                  &quot;추가&quot;를 탭하세요
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                오른쪽 상단의 &quot;추가&quot; 버튼을 탭하면 홈 화면에 앱이
                추가됩니다
              </p>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <Button onClick={handleDismiss} className="w-full" variant="outline">
            나중에 할게요
          </Button>
        </div>
      </div>
    </div>
  );
}

// iOS 여부 확인 유틸리티 훅
export function useIOSDetection() {
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [iOSVersion, setIOSVersion] = useState<number | null>(null);

  useEffect(() => {
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream;

    const safari =
      /Safari/.test(navigator.userAgent) &&
      !/CriOS|FxiOS|OPiOS|EdgiOS/.test(navigator.userAgent);

    const standalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true ||
      window.matchMedia('(display-mode: standalone)').matches;

    // iOS 버전 추출
    let version: number | null = null;
    if (iOS) {
      const match = navigator.userAgent.match(/OS (\d+)_/);
      if (match) {
        version = parseInt(match[1], 10);
      }
    }

    setIsIOS(iOS);
    setIsSafari(safari);
    setIsStandalone(standalone);
    setIOSVersion(version);
  }, []);

  return {
    isIOS,
    isSafari,
    isStandalone,
    iOSVersion,
    // iOS 16.4 이상에서만 PWA 푸시 알림 지원
    supportsPushInPWA: isIOS && iOSVersion !== null && iOSVersion >= 16,
    // Safari에서만 PWA 설치 가능
    canInstallPWA: isIOS && isSafari && !isStandalone,
  };
}
