'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import dynamic from 'next/dynamic';

import { ReactNode, useState } from 'react';

import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from '@/components/ui/sonner';

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

// DraftCleaner: arrangement-draft-store 번들을 메인 청크에서 분리
const DraftCleaner = dynamic(() => import('@/components/utils/DraftCleaner'), {
  ssr: false,
});

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
