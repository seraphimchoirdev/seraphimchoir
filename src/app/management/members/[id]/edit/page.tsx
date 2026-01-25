'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMember } from '@/hooks/useMembers';
import MemberForm from '@/components/features/members/MemberForm';

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const { data, isLoading, error } = useMember(memberId);
  const member = data?.data;

  const handleSuccess = () => {
    router.push(`/management/members/${memberId}`);
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--color-primary-600)] border-r-transparent"></div>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[var(--color-error-50)] border border-[var(--color-error-200)] rounded-lg p-4">
            <p className="text-sm text-[var(--color-error-800)]">
              {error?.message || '찬양대원 정보를 불러오는데 실패했습니다.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
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
            뒤로 가기
          </button>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">찬양대원 정보 수정</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{member.name} 찬양대원의 정보를 수정합니다.</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <MemberForm member={member} onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
