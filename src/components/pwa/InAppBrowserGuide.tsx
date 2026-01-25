'use client';

import { ExternalLink, Globe, X } from 'lucide-react';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

import { showInfo } from '@/lib/toast';

const STORAGE_KEY = 'inapp_browser_dismissed';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24시간

interface InAppBrowserGuideProps {
  forceShow?: boolean;
  onClose?: () => void;
}

// 인앱 브라우저 감지
function detectInAppBrowser(): {
  isInApp: boolean;
  appName: string | null;
  isIOS: boolean;
  isAndroid: boolean;
} {
  if (typeof window === 'undefined') {
    return { isInApp: false, appName: null, isIOS: false, isAndroid: false };
  }

  const ua = navigator.userAgent;

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
  const isAndroid = /Android/.test(ua);

  // 카카오톡 인앱 브라우저
  if (/KAKAOTALK/i.test(ua)) {
    return { isInApp: true, appName: '카카오톡', isIOS, isAndroid };
  }

  // 네이버 앱
  if (/NAVER/i.test(ua)) {
    return { isInApp: true, appName: '네이버', isIOS, isAndroid };
  }

  // 인스타그램
  if (/Instagram/i.test(ua)) {
    return { isInApp: true, appName: '인스타그램', isIOS, isAndroid };
  }

  // 페이스북
  if (/FBAN|FBAV/i.test(ua)) {
    return { isInApp: true, appName: '페이스북', isIOS, isAndroid };
  }

  // 라인
  if (/Line/i.test(ua)) {
    return { isInApp: true, appName: '라인', isIOS, isAndroid };
  }

  // 일반적인 인앱 브라우저 감지 (WebView)
  if (/wv|WebView/i.test(ua)) {
    return { isInApp: true, appName: null, isIOS, isAndroid };
  }

  return { isInApp: false, appName: null, isIOS, isAndroid };
}

export function InAppBrowserGuide({ forceShow, onClose }: InAppBrowserGuideProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<ReturnType<typeof detectInAppBrowser>>({
    isInApp: false,
    appName: null,
    isIOS: false,
    isAndroid: false,
  });

  useEffect(() => {
    const info = detectInAppBrowser();
    setBrowserInfo(info);

    if (!info.isInApp) return;

    // 이미 standalone 모드면 표시 안 함
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // 이전에 닫았는지 확인
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
    }

    // 약간의 딜레이 후 표시
    const timer = setTimeout(() => {
      setShowGuide(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShowGuide(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    onClose?.();
  };

  const handleOpenExternal = () => {
    const currentUrl = window.location.href;

    if (browserInfo.isIOS) {
      // iOS: Safari로 열기
      // 카카오톡의 경우 'kakaotalk://web/openExternal?url=' 사용
      if (browserInfo.appName === '카카오톡') {
        window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
      } else {
        // 일반적인 방법: Safari URL scheme
        window.location.href = `x-safari-${currentUrl}`;
        // 대체: intent 사용
        setTimeout(() => {
          window.open(currentUrl, '_system');
        }, 100);
      }
    } else if (browserInfo.isAndroid) {
      // Android: Chrome Intent 사용
      const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;

      // Intent가 실패할 경우를 대비해 일반 링크로 시도
      setTimeout(() => {
        window.open(currentUrl, '_blank');
      }, 500);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showInfo('주소가 복사되었습니다. Safari 또는 Chrome에서 붙여넣기 하세요.');
    } catch {
      // 클립보드 API 실패 시 대체 방법
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showInfo('주소가 복사되었습니다. Safari 또는 Chrome에서 붙여넣기 하세요.');
    }
  };

  const shouldShow = forceShow || showGuide;

  if (!shouldShow) {
    return null;
  }

  const browserName = browserInfo.isIOS ? 'Safari' : 'Chrome';

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 duration-300">
      <div className="animate-in zoom-in-95 w-full max-w-sm rounded-2xl bg-[var(--color-background-secondary)] shadow-2xl duration-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Globe className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--color-text-primary)]">
                외부 브라우저로 열기
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {browserInfo.appName
                  ? `${browserInfo.appName} 앱에서 접속 중`
                  : '인앱 브라우저에서 접속 중'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-full p-2 transition-colors hover:bg-[var(--color-background-tertiary)]"
            aria-label="닫기"
          >
            <X className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4">
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            앱 설치 및 모든 기능을 사용하려면{' '}
            <span className="font-medium text-[var(--color-text-primary)]">{browserName}</span>
            에서 열어주세요.
          </p>

          <div className="mt-4 rounded-lg bg-[var(--color-background-tertiary)] p-3">
            <p className="mb-2 text-xs text-[var(--color-text-tertiary)]">현재 주소</p>
            <p className="font-mono text-sm break-all text-[var(--color-text-primary)]">
              {typeof window !== 'undefined' ? window.location.href : ''}
            </p>
          </div>
        </div>

        {/* 버튼 */}
        <div className="space-y-2 border-t border-[var(--color-border)] p-4">
          <Button onClick={handleOpenExternal} className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            {browserName}에서 열기
          </Button>
          <Button variant="outline" onClick={copyToClipboard} className="w-full">
            주소 복사하기
          </Button>
          <button
            onClick={handleDismiss}
            className="w-full py-2 text-sm text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
          >
            그냥 계속하기
          </button>
        </div>
      </div>
    </div>
  );
}

// 인앱 브라우저 감지 훅
export function useInAppBrowserDetection() {
  const [browserInfo, setBrowserInfo] = useState<ReturnType<typeof detectInAppBrowser>>({
    isInApp: false,
    appName: null,
    isIOS: false,
    isAndroid: false,
  });

  useEffect(() => {
    setBrowserInfo(detectInAppBrowser());
  }, []);

  return browserInfo;
}
