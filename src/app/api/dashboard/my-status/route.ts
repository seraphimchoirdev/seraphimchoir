import { NextResponse } from 'next/server';

import { getNextSunday } from '@/lib/dashboard-context';
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
 * 내 투표 여부, 내 좌석 위치를 반환합니다.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 프로필 정보 조회
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('linked_member_id, link_status, role')
      .eq('id', user.id)
      .single();

    const linkedMemberId = profile?.linked_member_id;
    const linkStatus = profile?.link_status as 'pending' | 'approved' | 'rejected' | null;
    const userRole = profile?.role;
    const isLinked = !!linkedMemberId && linkStatus === 'approved';

    // 역할 보유자(ADMIN, CONDUCTOR 등)는 대원 연결 없이도 서비스 접근 가능
    const hasStaffRole = !!userRole && ['ADMIN', 'CONDUCTOR', 'MANAGER'].includes(userRole);

    const adminSupabase = await createAdminClient();
    const nextSunday = getNextSunday();

    // 연결된 대원이 없고, 역할도 없는 경우 기본 응답
    if (!isLinked && !hasStaffRole) {
      const response: MyDashboardStatusResponse = {
        isLinked: false,
        linkStatus,
        linkedMemberName: null,
        linkedMemberPart: null,
        myVote: null,
        mySeat: null,
        nextServiceDate: nextSunday,
      };
      return NextResponse.json(response);
    }

    // 역할 보유자이지만 대원 연결이 없는 경우 (ADMIN 등)
    if (!linkedMemberId) {
      const response: MyDashboardStatusResponse = {
        isLinked: true,
        linkStatus,
        linkedMemberName: profile?.role || null,
        linkedMemberPart: null,
        myVote: null,
        mySeat: null,
        nextServiceDate: nextSunday,
      };
      return NextResponse.json(response);
    }

    // 3개 독립 쿼리 병렬 실행: 대원 정보, 투표, 배치표
    const [memberResult, attendanceResult, arrangementResult] = await Promise.all([
      // 연결된 대원 정보 조회
      adminSupabase.from('members').select('name, part').eq('id', linkedMemberId).single(),

      // 내 투표 (다음 주일)
      adminSupabase
        .from('attendances')
        .select('date, is_service_available, notes')
        .eq('member_id', linkedMemberId)
        .eq('date', nextSunday)
        .maybeSingle(),

      // 배치표 (SHARED 또는 CONFIRMED인 경우만)
      adminSupabase
        .from('arrangements')
        .select('id, date, status')
        .eq('date', nextSunday)
        .in('status', ['SHARED', 'CONFIRMED'])
        .maybeSingle(),
    ]);

    const member = memberResult.data;

    const myVote: MyVote | null = attendanceResult.data
      ? {
          date: attendanceResult.data.date,
          isAvailable: attendanceResult.data.is_service_available,
          notes: attendanceResult.data.notes,
        }
      : null;

    // 좌석 조회는 배치표 결과에 의존
    let mySeat: MySeat | null = null;
    const arrangement = arrangementResult.data;

    if (arrangement) {
      const { data: seat } = await adminSupabase
        .from('seats')
        .select('seat_row, seat_column, is_row_leader')
        .eq('arrangement_id', arrangement.id)
        .eq('member_id', linkedMemberId)
        .maybeSingle();

      if (seat) {
        mySeat = {
          arrangementId: arrangement.id,
          arrangementDate: arrangement.date,
          arrangementStatus: arrangement.status as ArrangementStatus | null,
          row: seat.seat_row,
          column: seat.seat_column,
          isRowLeader: seat.is_row_leader || false,
        };
      }
    }

    const response: MyDashboardStatusResponse = {
      isLinked: true,
      linkStatus,
      linkedMemberName: member?.name || null,
      linkedMemberPart: member?.part || null,
      myVote,
      mySeat,
      nextServiceDate: nextSunday,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('My Status Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
