'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MemberDetail from '@/components/features/members/MemberDetail';

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  return (
    <div className="min-h-screen bg-[var(--color-background-tertiary)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-4"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            목록으로 돌아가기
          </button>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">찬양대원 상세 정보</h1>
        </div>

        {/* 상세 정보 */}
        <MemberDetail memberId={memberId} />
      </div>
    </div>
  );
}
