'use client';

import { Suspense } from 'react';
import MemberList from '@/components/features/members/MemberList';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

export default function MembersPage() {
  const { hasRole, isLoading: authLoading } = useAuth();

  // 대원 관리 권한: ADMIN, CONDUCTOR, MANAGER, PART_LEADER
  const hasPermission = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']);

  if (authLoading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[var(--color-background-tertiary)] flex items-center justify-center py-20">
          <Spinner size="lg" variant="default" />
        </div>
      </AppShell>
    );
  }

  if (!hasPermission) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[var(--color-background-tertiary)]">
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Alert variant="error">
              <AlertDescription>
                찬양대원 관리 페이지에 접근할 권한이 없습니다.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* 헤더 */}
          <div>
            <h2 className="heading-2 text-[var(--color-text-primary)]">찬양대원 관리</h2>
            <p className="mt-2 body-base text-[var(--color-text-secondary)]">
              찬양대원의 정보를 등록하고 관리할 수 있습니다.
            </p>
          </div>

          {/* 목록 */}
          <Suspense
            fallback={
              <div className="text-center py-12">
                <Spinner size="lg" variant="default" />
                <p className="mt-4 text-[var(--color-text-secondary)] body-base">로딩 중...</p>
              </div>
            }
          >
            <MemberList />
          </Suspense>
        </div>
      </div>
    </AppShell>
  );
}
