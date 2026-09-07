import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import BulkServiceScheduleClient from '@/components/features/service-schedules/BulkServiceScheduleClient';

import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: '예배 일정 일괄 등록 | 새로핌On',
  description: '예배 일정을 파일로 일괄 등록합니다',
};

/**
 * 예배 일정 일괄 등록 페이지
 *
 * 원래 목록 화면의 모달이었다. OCR로 뽑은 표를 행마다 확인·수정하는 작업이라
 * 내용이 모달 높이를 넘겨 바깥 스크롤과 표 안쪽 스크롤이 겹쳤고, 새로고침하면
 * 작업이 통째로 사라졌다. 전용 페이지로 옮겨 세로 공간을 쓰고 뒤로가기·
 * 새로고침이 정상 동작하게 한다.
 *
 * 권한: MANAGER 이상 (일정 목록 화면의 canManageService와 같은 기준)
 * 클라이언트의 hasRole은 버튼을 숨길 뿐이므로 서버에서 다시 검사한다.
 */
export default async function BulkServiceSchedulePage() {
  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/service-schedules/bulk');
  }

  // 권한 확인 (MANAGER 이상)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER'];
  if (!profile?.role || !allowedRoles.includes(profile.role)) {
    redirect('/service-schedules?error=permission_denied');
  }

  return <BulkServiceScheduleClient />;
}
