'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { createLogger } from '@/lib/logger';

import { useAuthStore } from '@/store/authStore';

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

  // 스플래시 스크린이 표시되는 동안 빈 화면 유지 (스플래시가 덮고 있음)
  return <div className="min-h-screen bg-white" suppressHydrationWarning />;
}
