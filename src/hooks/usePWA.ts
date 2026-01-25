'use client';

import { useCallback, useEffect, useState } from 'react';

import { isIOSPushSupported, isPushSupported } from '@/lib/push-notifications';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePWAResult {
  // 설치 관련
  isInstalled: boolean;
  canInstall: boolean;
  installApp: () => Promise<boolean>;

  // 플랫폼 감지
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  iOSVersion: number | null;

  // 푸시 알림 관련
  pushPermission: PushPermission;
  canRequestPush: boolean;
  requestPushPermission: () => Promise<PushPermission>;

  // 유틸리티
  isStandalone: boolean;
  supportsPushInPWA: boolean;
}

export function usePWA(): UsePWAResult {
  // 설치 상태
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // 플랫폼 감지
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [iOSVersion, setIOSVersion] = useState<number | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // 푸시 알림
  const [pushPermission, setPushPermission] = useState<PushPermission>('default');

  // 브라우저 환경 초기화 - 클라이언트 측에서만 감지 가능한 값들
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // 플랫폼 감지
    const userAgent = navigator.userAgent;

    const iOS =
      /iPad|iPhone|iPod/.test(userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;

    const android = /Android/.test(userAgent);

    const safari = /Safari/.test(userAgent) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome/.test(userAgent);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    // iOS 버전 추출
    let version: number | null = null;
    if (iOS) {
      const match = userAgent.match(/OS (\d+)_/);
      if (match) {
        version = parseInt(match[1], 10);
      }
    }

    setIsIOS(iOS);
    setIsAndroid(android);
    setIsSafari(safari);
    setIOSVersion(version);
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // 푸시 알림 권한 상태
    if (isPushSupported()) {
      setPushPermission(Notification.permission as PushPermission);
    } else {
      setPushPermission('unsupported');
    }

    // beforeinstallprompt 이벤트 리스너
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    // display-mode 변경 감지
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      setIsInstalled(e.matches);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    displayModeQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      displayModeQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  // 앱 설치 함수
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }

      setDeferredPrompt(null);
      return false;
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  // 푸시 알림 권한 요청 함수
  const requestPushPermission = useCallback(async (): Promise<PushPermission> => {
    if (!isPushSupported()) {
      return 'unsupported';
    }

    // iOS에서는 PWA 모드이고 16.4 이상일 때만 가능
    if (isIOS && !isIOSPushSupported()) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      const permission = result as PushPermission;
      setPushPermission(permission);
      return permission;
    } catch {
      return 'denied';
    }
  }, [isIOS]);

  // 설치 가능 여부 (Android/Chrome에서만)
  const canInstall = !!deferredPrompt && !isInstalled;

  // 푸시 권한 요청 가능 여부
  const canRequestPush =
    pushPermission === 'default' && isPushSupported() && (!isIOS || isIOSPushSupported());

  // iOS PWA에서 푸시 지원 여부
  const supportsPushInPWA = !isIOS || (iOSVersion !== null && iOSVersion >= 16);

  return {
    // 설치 관련
    isInstalled,
    canInstall,
    installApp,

    // 플랫폼 감지
    isIOS,
    isAndroid,
    isSafari,
    iOSVersion,

    // 푸시 알림 관련
    pushPermission,
    canRequestPush,
    requestPushPermission,

    // 유틸리티
    isStandalone,
    supportsPushInPWA,
  };
}
