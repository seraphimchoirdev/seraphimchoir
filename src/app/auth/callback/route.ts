import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth Callback Route
 *
 * 카카오 로그인 후 이 라우트로 리다이렉트됩니다.
 * 1. Authorization code를 세션으로 교환
 * 2. 사용자 프로필 확인
 * 3. 대원 연결 상태에 따라 적절한 페이지로 리다이렉트
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();

    // Authorization code를 세션으로 교환
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('OAuth 세션 교환 실패:', exchangeError);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    // 현재 사용자 정보 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('사용자 정보 조회 실패:', userError);
      return NextResponse.redirect(`${origin}/login?error=user_fetch_failed`);
    }

    // 사용자 프로필 확인
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('linked_member_id, link_status, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('프로필 조회 실패:', profileError);
      // 프로필이 없으면 대원 연결 페이지로
      return NextResponse.redirect(`${origin}/member-link`);
    }

    // 대원 연결 상태에 따라 리다이렉트
    if (profile.role) {
      // 역할이 있으면 (관리자/파트장 등) 대시보드로
      return NextResponse.redirect(`${origin}${next}`);
    } else if (profile.link_status === 'approved') {
      // 대원 연결 승인됨 → 내 출석 페이지로
      return NextResponse.redirect(`${origin}/my-attendance`);
    } else if (profile.link_status === 'pending') {
      // 대원 연결 대기중 → 대기 안내 페이지로
      return NextResponse.redirect(`${origin}/member-link?status=pending`);
    } else {
      // 대원 연결 안됨 → 대원 연결 페이지로
      return NextResponse.redirect(`${origin}/member-link`);
    }
  }

  // code가 없으면 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
