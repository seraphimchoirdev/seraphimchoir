'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import dynamic from 'next/dynamic';

import { ReactNode, useEffect, useState } from 'react';

import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from '@/components/ui/sonner';

import { useArrangementDraftStore } from '@/store/arrangement-draft-store';

// PWA 컴포넌트: 조건부 null 반환이므로 ssr: false로 안전하게 lazy-load
const ServiceWorkerRegistration = dynamic(
  () =>
    import('@/components/pwa/ServiceWorkerRegistration').then(
      (mod) => mod.ServiceWorkerRegistration
    ),
  { ssr: false }
);
const InAppBrowserGuide = dynamic(
  () =>
    import('@/components/pwa/InAppBrowserGuide').then(
      (mod) => mod.InAppBrowserGuide
    ),
  { ssr: false }
);
const PWAInstallPrompt = dynamic(
  () =>
    import('@/components/pwa/PWAInstallPrompt').then(
      (mod) => mod.PWAInstallPrompt
    ),
  { ssr: false }
);
const IOSInstallGuide = dynamic(
  () =>
    import('@/components/pwa/IOSInstallGuide').then(
      (mod) => mod.IOSInstallGuide
    ),
  { ssr: false }
);

/**
 * 만료된 Draft 정리 컴포넌트
 * 앱 시작 시 7일 이상 된 draft 데이터를 자동 삭제
 * requestIdleCallback으로 지연 실행하여 critical path에서 제거
 */
function DraftCleaner() {
  const { clearExpiredDrafts } = useArrangementDraftStore();

  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => clearExpiredDrafts());
      return () => window.cancelIdleCallback(id);
    } else {
      // Safari 폴백
      const timer = setTimeout(() => clearExpiredDrafts(), 3000);
      return () => clearTimeout(timer);
    }
  }, [clearExpiredDrafts]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1분
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        {/* Draft 정리 (앱 유휴 시 만료된 draft 삭제) */}
        <DraftCleaner />
        {/* PWA 컴포넌트 (lazy-loaded) */}
        <ServiceWorkerRegistration />
        <InAppBrowserGuide />
        <PWAInstallPrompt />
        <IOSInstallGuide />
        {/* Toast 알림 */}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
