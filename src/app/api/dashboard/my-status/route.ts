import { NextResponse } from 'next/server';

import { fetchMyDashboardStatus } from '@/lib/dashboard-data';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ArrangementStatus } from '@/types';

export interface MyVote {
  date: string;
  isAvailable: boolean;
  notes: string | null;
}

export interface MySeat {
  arrangementId: string;
  arrangementDate: string;
  arrangementStatus: ArrangementStatus | null;
  row: number;
  column: number;
  isRowLeader: boolean;
}

export interface MyDashboardStatusResponse {
  isLinked: boolean;
  linkStatus: 'pending' | 'approved' | 'rejected' | null;
  linkedMemberName: string | null;
  linkedMemberPart: string | null;
  myVote: MyVote | null;
  mySeat: MySeat | null;
  nextServiceDate: string;
}

/**
 * 대원용 대시보드 상태 API
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

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role, linked_member_id, link_status')
      .eq('id', user.id)
      .single();

    const adminSupabase = await createAdminClient();

    const response = await fetchMyDashboardStatus(adminSupabase, {
      id: user.id,
      role: profile?.role ?? null,
      linked_member_id: profile?.linked_member_id ?? null,
      link_status: profile?.link_status ?? null,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('My Dashboard Status Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
