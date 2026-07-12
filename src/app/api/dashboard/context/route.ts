import { NextResponse } from 'next/server';

import { fetchDashboardContext } from '@/lib/dashboard-data';
import { getProfileCached } from '@/lib/profile-cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * 대시보드 컨텍스트 API
 *
 * 현재 사용자의 시간 컨텍스트, 다음 예배 정보, 투표 마감 정보 등을 반환합니다.
 * 조회 로직은 SSR 프리페치와 동일한 src/lib/dashboard-data.ts를 사용한다
 * (이중 구현으로 SSR/폴링 데이터가 어긋나는 것을 방지).
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 60초 폴링마다 반복되는 프로필 조회를 단기 캐시로 흡수 (B8)
    const profile = await getProfileCached(supabase, user.id);

    const adminSupabase = await createAdminClient();

    const response = await fetchDashboardContext(adminSupabase, {
      id: user.id,
      role: profile?.role ?? null,
      linked_member_id: profile?.linked_member_id ?? null,
      link_status: profile?.link_status ?? null,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard Context Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
