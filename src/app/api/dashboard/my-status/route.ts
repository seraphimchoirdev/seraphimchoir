import { NextResponse } from 'next/server';

import { formatDate, getNextSunday } from '@/lib/dashboard-context';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ArrangementStatus } from '@/types/database.types';

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

export interface RecentVote {
  date: string;
  isAvailable: boolean;
  notes: string | null;
}

export interface MyDashboardStatusResponse {
  isLinked: boolean;
  linkStatus: 'pending' | 'approved' | 'rejected' | null;
  linkedMemberName: string | null;
  linkedMemberPart: string | null;
  myVote: MyVote | null;
  mySeat: MySeat | null;
  recentVotes: RecentVote[];
  nextServiceDate: string;
}

/**
 * 대원용 대시보드 상태 API
 *
 * 내 투표 여부, 내 좌석 위치, 최근 투표 이력을 반환합니다.
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
      .select('linked_member_id, link_status')
      .eq('id', user.id)
      .single();

    const linkedMemberId = profile?.linked_member_id;
    const linkStatus = profile?.link_status as 'pending' | 'approved' | 'rejected' | null;
    const isLinked = !!linkedMemberId && linkStatus === 'approved';

    const adminSupabase = await createAdminClient();
    const nextSunday = getNextSunday();

    // 연결된 대원이 없는 경우 기본 응답
    if (!isLinked || !linkedMemberId) {
      const response: MyDashboardStatusResponse = {
        isLinked: false,
        linkStatus,
        linkedMemberName: null,
        linkedMemberPart: null,
        myVote: null,
        mySeat: null,
        recentVotes: [],
        nextServiceDate: nextSunday,
      };
      return NextResponse.json(response);
    }

    // 연결된 대원 정보 조회
    const { data: member } = await adminSupabase
      .from('members')
      .select('name, part')
      .eq('id', linkedMemberId)
      .single();

    // 1. 내 투표 (다음 주일)
    const { data: myAttendance } = await adminSupabase
      .from('attendances')
      .select('date, is_service_available, notes')
      .eq('member_id', linkedMemberId)
      .eq('date', nextSunday)
      .maybeSingle();

    const myVote: MyVote | null = myAttendance
      ? {
          date: myAttendance.date,
          isAvailable: myAttendance.is_service_available,
          notes: myAttendance.notes,
        }
      : null;

    // 2. 내 좌석 (배치표가 SHARED 또는 CONFIRMED인 경우만)
    let mySeat: MySeat | null = null;

    const { data: arrangement } = await adminSupabase
      .from('arrangements')
      .select('id, date, status')
      .eq('date', nextSunday)
      .in('status', ['SHARED', 'CONFIRMED'])
      .maybeSingle();

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

    // 3. 최근 투표 이력 (최근 4건)
    const { data: recentAttendances } = await adminSupabase
      .from('attendances')
      .select('date, is_service_available, notes')
      .eq('member_id', linkedMemberId)
      .order('date', { ascending: false })
      .limit(4);

    const recentVotes: RecentVote[] =
      recentAttendances?.map((a) => ({
        date: a.date,
        isAvailable: a.is_service_available,
        notes: a.notes,
      })) || [];

    const response: MyDashboardStatusResponse = {
      isLinked: true,
      linkStatus,
      linkedMemberName: member?.name || null,
      linkedMemberPart: member?.part || null,
      myVote,
      mySeat,
      recentVotes,
      nextServiceDate: nextSunday,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('My Status Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
