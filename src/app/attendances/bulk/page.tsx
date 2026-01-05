import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BulkAttendanceTabs from '@/components/features/attendances/BulkAttendanceTabs';

export const metadata: Metadata = {
  title: '일괄 출석 입력 | 찬양대 자리배치',
  description: '찬양대원 출석을 일괄로 입력합니다',
};

/**
 * 일괄 출석 입력 페이지
 * 권한: PART_LEADER 이상
 */
export default async function BulkAttendancePage() {
  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/attendances/bulk');
  }

  // 권한 확인 (PART_LEADER 이상)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER'];
  if (!profile?.role || !allowedRoles.includes(profile.role)) {
    redirect('/attendances?error=permission_denied');
  }

  return (
    <div className="min-h-screen bg-[var(--color-background-tertiary)] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">일괄 출석 입력</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            찬양대원 출석을 날짜별로 일괄 입력하거나 CSV 파일로 업로드할 수
            있습니다.
          </p>
        </div>

        {/* 탭 UI */}
        <BulkAttendanceTabs />
      </div>
    </div>
  );
}
