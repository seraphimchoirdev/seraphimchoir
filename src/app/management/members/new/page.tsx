'use client';

import { useRouter } from 'next/navigation';
import MemberForm from '@/components/features/members/MemberForm';

export default function NewMemberPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/management/members');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">찬양대원 등록</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">새로운 찬양대원의 정보를 입력해주세요.</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <MemberForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
