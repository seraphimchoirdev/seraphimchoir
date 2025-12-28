'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    console.log('HomePage: hasHydrated =', hasHydrated, 'isAuthenticated =', isAuthenticated);

    // Hydration 완료 후 인증된 사용자는 대시보드로 리다이렉트
    if (hasHydrated && isAuthenticated) {
      console.log('HomePage: 로그인됨, /dashboard로 리다이렉트');
      router.push('/dashboard');
    }
  }, [isAuthenticated, hasHydrated, router]);

  // Hydration 완료 전에만 로딩 표시
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-primary)]" suppressHydrationWarning>
        <div className="text-center">
          <Spinner size="lg" variant="default" />
          <p className="mt-4 text-[var(--color-text-secondary)] body-base">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background-secondary)]" suppressHydrationWarning>
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl space-y-12 text-center">

          {/* Hero Section */}
          <div className="space-y-6 py-12 sm:py-20 bg-[var(--gradient-blessed-sky)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] text-white px-6">
            <h1 className="heading-1 text-white drop-shadow-sm">
              찬양대 자리배치 시스템
            </h1>
            <p className="body-large text-white/90 max-w-2xl mx-auto">
              AI 기반 자동 추천으로 효율적인 자리배치를 경험하세요.<br />
              새로핌찬양대를 위한 스마트한 솔루션입니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="bg-white text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] border-none shadow-md">
                <Link href="/login">로그인</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-transparent text-white border-white hover:bg-white/20 hover:border-white">
                <Link href="/signup">회원가입</Link>
              </Button>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
            <Card className="border-none shadow-[var(--shadow-base)] hover:shadow-[var(--shadow-md)] transition-all duration-300">
              <CardHeader>
                <div className="mb-4 text-4xl">🎵</div>
                <CardTitle className="heading-3 text-[var(--color-primary-700)]">인원 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="body-base text-[var(--color-text-secondary)]">
                  찬양대원 프로필 등록 및<br />주간 등단 현황을 체계적으로 관리합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-[var(--shadow-base)] hover:shadow-[var(--shadow-md)] transition-all duration-300">
              <CardHeader>
                <div className="mb-4 text-4xl">🤖</div>
                <CardTitle className="heading-3 text-[var(--color-primary-700)]">AI 자동 배치</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="body-base text-[var(--color-text-secondary)]">
                  과거 데이터를 학습하여<br />최적의 자리배치를 자동으로 추천합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-[var(--shadow-base)] hover:shadow-[var(--shadow-md)] transition-all duration-300">
              <CardHeader>
                <div className="mb-4 text-4xl">✏️</div>
                <CardTitle className="heading-3 text-[var(--color-primary-700)]">수동 조정</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="body-base text-[var(--color-text-secondary)]">
                  드래그 앤 드롭으로<br />간편하게 자리를 미세 조정할 수 있습니다.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-sm text-[var(--color-text-tertiary)]">
            <p>워드 작업 대비 80% 시간 절감 목표</p>
          </div>
        </div>
      </main>
    </div>
  );
}
