import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * 출석 관리 레이아웃
 *
 * 서버 사이드에서 인증 체크를 수행하여 보안을 강화합니다.
 */
export default async function AttendancesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
