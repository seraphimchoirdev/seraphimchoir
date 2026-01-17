'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { AuthProvider } from '@/components/providers/AuthProvider';
import {
  ServiceWorkerRegistration,
  PWAInstallPrompt,
  IOSInstallGuide,
} from '@/components/pwa';

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
        {/* PWA 컴포넌트 */}
        <ServiceWorkerRegistration />
        <PWAInstallPrompt />
        <IOSInstallGuide />
      </AuthProvider>
    </QueryClientProvider>
  );
}
