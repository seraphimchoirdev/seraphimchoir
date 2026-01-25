'use client';

import { Suspense } from 'react';

import MemberList from '@/components/features/members/MemberList';
import { Spinner } from '@/components/ui/spinner';

export default function ManagementMembersPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* 헤더 */}
        <div>
          <h2 className="heading-2 text-[var(--color-text-primary)]">찬양대원 관리</h2>
          <p className="body-base mt-2 text-[var(--color-text-secondary)]">
            찬양대원의 정보를 등록하고 관리할 수 있습니다.
          </p>
        </div>

        {/* 목록 */}
        <Suspense
          fallback={
            <div className="py-12 text-center">
              <Spinner size="lg" variant="default" />
              <p className="body-base mt-4 text-[var(--color-text-secondary)]">로딩 중...</p>
            </div>
          }
        >
          <MemberList />
        </Suspense>
      </div>
    </div>
  );
}
