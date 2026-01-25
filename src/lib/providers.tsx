'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, useEffect } from 'react';
import { AuthProvider } from '@/components/providers/AuthProvider';
import {
  ServiceWorkerRegistration,
  PWAInstallPrompt,
  IOSInstallGuide,
  InAppBrowserGuide,
} from '@/components/pwa';
import { useArrangementDraftStore } from '@/store/arrangement-draft-store';

/**
 * 만료된 Draft 정리 컴포넌트
 * 앱 시작 시 7일 이상 된 draft 데이터를 자동 삭제
 */
function DraftCleaner() {
  const { clearExpiredDrafts } = useArrangementDraftStore();

  useEffect(() => {
    // 앱 시작 시 만료된 draft 정리
    clearExpiredDrafts();
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
        {/* Draft 정리 (앱 시작 시 만료된 draft 삭제) */}
        <DraftCleaner />
        {/* PWA 컴포넌트 */}
        <ServiceWorkerRegistration />
        <InAppBrowserGuide />
        <PWAInstallPrompt />
        <IOSInstallGuide />
      </AuthProvider>
    </QueryClientProvider>
  );
}
