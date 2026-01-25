'use client';

import { AlertCircle, Bell, BellOff, X } from 'lucide-react';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

const STORAGE_KEY_DISMISSED = 'push_prompt_dismissed';
const STORAGE_KEY_PAGE_VIEWS = 'push_prompt_page_views';
const MIN_PAGE_VIEWS = 3;

type NotificationPermission = 'default' | 'granted' | 'denied';

interface PushNotificationPromptProps {
  forceShow?: boolean;
  onPermissionChange?: (permission: NotificationPermission) => void;
}

export function PushNotificationPrompt({
  forceShow,
  onPermissionChange,
}: PushNotificationPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [iOSVersion, setIOSVersion] = useState<number | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // 브라우저 지원 확인
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // 현재 권한 상태
    setPermission(Notification.permission as NotificationPermission);

    // iOS 감지
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream;

    const standalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
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
    setIsStandalone(standalone);
    setIOSVersion(version);

    // 이미 권한이 결정되었으면 표시 안함
    if (Notification.permission !== 'default') {
      return;
    }

    // 이전에 닫았는지 확인
    if (localStorage.getItem(STORAGE_KEY_DISMISSED)) {
      return;
    }

    // 페이지 뷰 카운트
    const pageViews = parseInt(localStorage.getItem(STORAGE_KEY_PAGE_VIEWS) || '0', 10);
    localStorage.setItem(STORAGE_KEY_PAGE_VIEWS, (pageViews + 1).toString());

    // iOS에서는 PWA 모드이고 16.4+ 이상일 때만 표시
    if (iOS) {
      if (!standalone || (version !== null && version < 16)) {
        return;
      }
    }

    // 최소 페이지 뷰 이상일 때만 표시
    if (pageViews + 1 >= MIN_PAGE_VIEWS) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // 3초 후 표시

      return () => clearTimeout(timer);
    }
  }, []);

  const handleRequestPermission = useCallback(async () => {
    setIsRequesting(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      onPermissionChange?.(result as NotificationPermission);

      if (result === 'granted') {
        setShowPrompt(false);
        // FCM 토큰 요청은 여기서 처리 (향후 구현)
        // await requestFCMToken();
      } else {
        // 거부됨 - 프롬프트 닫기
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('푸시 알림 권한 요청 실패:', error);
    } finally {
      setIsRequesting(false);
    }
  }, [onPermissionChange]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
  }, []);

  const shouldShow = forceShow || (showPrompt && permission === 'default' && !isRequesting);

  // iOS에서 PWA가 아니거나 버전이 낮으면 안내만 표시
  const showIOSNotSupported =
    forceShow && isIOS && (!isStandalone || (iOSVersion && iOSVersion < 16));

  if (!shouldShow && !showIOSNotSupported) {
    return null;
  }

  if (showIOSNotSupported) {
    return (
      <div className="animate-in slide-in-from-bottom-4 fixed right-4 bottom-20 left-4 z-50 mx-auto max-w-md duration-300">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[var(--color-text-primary)]">푸시 알림 제한</h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {!isStandalone
                  ? 'iOS에서 푸시 알림을 받으려면 먼저 앱을 홈 화면에 설치해주세요.'
                  : 'iOS 16.4 이상에서만 푸시 알림이 지원됩니다.'}
              </p>
            </div>
            <button
              onClick={() => onPermissionChange?.('denied')}
              className="flex-shrink-0 rounded-full p-1 transition-colors hover:bg-[var(--color-background-tertiary)]"
              aria-label="닫기"
            >
              <X className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 fixed right-4 bottom-20 left-4 z-50 mx-auto max-w-md duration-300">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
            <Bell className="h-6 w-6 text-[var(--color-primary)]" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[var(--color-text-primary)]">알림을 받으시겠어요?</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              예배 일정, 출석 투표 알림 등 중요한 소식을 놓치지 마세요
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 rounded-full p-1 transition-colors hover:bg-[var(--color-background-tertiary)]"
            aria-label="닫기"
          >
            <X className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDismiss} className="flex-1">
            <BellOff className="mr-2 h-4 w-4" />
            나중에
          </Button>
          <Button
            size="sm"
            onClick={handleRequestPermission}
            className="flex-1"
            disabled={isRequesting}
          >
            <Bell className="mr-2 h-4 w-4" />
            알림 받기
          </Button>
        </div>
      </div>
    </div>
  );
}

// 푸시 알림 권한 상태 훅
export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'denied' as NotificationPermission;

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result as NotificationPermission;
    } catch {
      return 'denied' as NotificationPermission;
    }
  }, [isSupported]);

  return {
    permission,
    isSupported,
    requestPermission,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
  };
}
