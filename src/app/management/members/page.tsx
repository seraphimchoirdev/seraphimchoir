'use client';

import { Suspense } from 'react';
import MemberList from '@/components/features/members/MemberList';
import { Spinner } from '@/components/ui/spinner';

export default function ManagementMembersPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
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
  );
}
