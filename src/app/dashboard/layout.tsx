import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

/**
 * 대시보드 레이아웃
 *
 * 서버 사이드에서 인증 체크를 수행하여 보안을 강화합니다.
 * - 미들웨어에서 1차 체크
 * - 레이아웃에서 2차 체크 (이중 보안)
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
