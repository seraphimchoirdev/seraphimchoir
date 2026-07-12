import { NextResponse } from 'next/server';

import { fetchPendingApprovals } from '@/lib/dashboard-data';
import { getProfileCached } from '@/lib/profile-cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export interface PendingApproval {
  userId: string;
  userName: string;
  userEmail: string;
  requestedMemberId: string;
  requestedMemberName: string;
  requestedMemberPart: string;
  requestedAt: string;
}

export interface PendingApprovalsResponse {
  pendingApprovals: PendingApproval[];
  totalCount: number;
}

/**
 * 대기 중인 승인 건 조회 API (ADMIN 전용)
 *
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
    const currentProfile = await getProfileCached(supabase, user.id);

    // ADMIN만 접근 가능
    if (currentProfile?.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const adminSupabase = await createAdminClient();
    const response = await fetchPendingApprovals(adminSupabase);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Pending Approvals Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
