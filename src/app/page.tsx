'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Spinner } from '@/components/ui/spinner';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'HomePage' });

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    logger.debug('hasHydrated =', hasHydrated, 'isAuthenticated =', isAuthenticated);

    if (hasHydrated) {
      if (isAuthenticated) {
        logger.debug('로그인됨, /dashboard로 리다이렉트');
        router.replace('/dashboard');
      } else {
        logger.debug('미로그인, /login으로 리다이렉트');
        router.replace('/login');
      }
    }
  }, [isAuthenticated, hasHydrated, router]);

  // 항상 로딩 표시 (리다이렉트 전까지)
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-primary)]" suppressHydrationWarning>
      <div className="text-center">
        <Spinner size="lg" variant="default" />
        <p className="mt-4 text-[var(--color-text-secondary)] body-base">로딩 중...</p>
      </div>
    </div>
  );
}
