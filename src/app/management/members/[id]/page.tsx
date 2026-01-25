'use client';

import { useParams, useRouter } from 'next/navigation';

import MemberDetail from '@/components/features/members/MemberDetail';

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <svg className="mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            목록으로 돌아가기
          </button>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            찬양대원 상세 정보
          </h1>
        </div>

        {/* 상세 정보 */}
        <MemberDetail memberId={memberId} />
      </div>
    </div>
  );
}
