import { NextResponse } from 'next/server';

import { formatDate, getNextSunday } from '@/lib/dashboard-context';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ArrangementStatus } from '@/types/database.types';

export interface ConductorStatusResponse {
  latestArrangement: {
    id: string;
    date: string;
    title: string;
    status: ArrangementStatus | null;
    seatCount: number;
    hasRowLeaders: boolean;
  } | null;
  attendanceSummary: {
    totalMembers: number;
    availableCount: number;
    unavailableCount: number;
    noResponseCount: number;
    byPart: {
      part: string;
      total: number;
      available: number;
      unavailable: number;
      noResponse: number;
    }[];
  };
  nextServiceDate: string;
}

/**
 * 지휘자용 대시보드 상태 API
 *
 * 배치 작업 현황, 출석 현황 요약을 반환합니다.
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

    const adminSupabase = await createAdminClient();
    const nextSunday = getNextSunday();

    // 1. 최근 배치표 조회 (다음 주일 또는 가장 최근)
    let arrangement = null;

    // 먼저 다음 주일 배치표 확인
    const { data: nextArrangement } = await adminSupabase
      .from('arrangements')
      .select('id, date, title, status')
      .eq('date', nextSunday)
      .maybeSingle();

    if (nextArrangement) {
      arrangement = nextArrangement;
    } else {
      // 없으면 가장 최근 배치표
      const { data: latestArrangement } = await adminSupabase
        .from('arrangements')
        .select('id, date, title, status')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      arrangement = latestArrangement;
    }

    // 배치표가 있으면 좌석 정보 조회
    let seatCount = 0;
    let hasRowLeaders = false;

    if (arrangement) {
      const { data: seats } = await adminSupabase
        .from('seats')
        .select('id, is_row_leader')
        .eq('arrangement_id', arrangement.id);

      seatCount = seats?.length || 0;
      hasRowLeaders = seats?.some((s) => s.is_row_leader) || false;
    }

    // 2. 출석 현황 조회 (다음 주일 기준)
    // 활동 중인 대원 목록
    const { data: activeMembers } = await adminSupabase
      .from('members')
      .select('id, part')
      .in('member_status', ['REGULAR', 'NEW'])
      .eq('is_singer', true);

    // 출석 투표 데이터
    const { data: attendances } = await adminSupabase
      .from('attendances')
      .select('member_id, is_service_available')
      .eq('date', nextSunday);

    // 출석 맵 생성
    const attendanceMap = new Map(
      attendances?.map((a) => [a.member_id, a.is_service_available]) || []
    );

    // 파트별 집계
    const partCounts: Record<
      string,
      { total: number; available: number; unavailable: number; noResponse: number }
    > = {};
    const parts = ['SOPRANO', 'ALTO', 'TENOR', 'BASS'];

    parts.forEach((part) => {
      partCounts[part] = { total: 0, available: 0, unavailable: 0, noResponse: 0 };
    });

    let totalAvailable = 0;
    let totalUnavailable = 0;
    let totalNoResponse = 0;

    activeMembers?.forEach((member) => {
      const part = member.part;
      if (!partCounts[part]) {
        partCounts[part] = { total: 0, available: 0, unavailable: 0, noResponse: 0 };
      }

      partCounts[part].total++;

      const attendance = attendanceMap.get(member.id);
      if (attendance === undefined) {
        partCounts[part].noResponse++;
        totalNoResponse++;
      } else if (attendance) {
        partCounts[part].available++;
        totalAvailable++;
      } else {
        partCounts[part].unavailable++;
        totalUnavailable++;
      }
    });

    const response: ConductorStatusResponse = {
      latestArrangement: arrangement
        ? {
            id: arrangement.id,
            date: arrangement.date,
            title: arrangement.title,
            status: arrangement.status as ArrangementStatus | null,
            seatCount,
            hasRowLeaders,
          }
        : null,
      attendanceSummary: {
        totalMembers: activeMembers?.length || 0,
        availableCount: totalAvailable,
        unavailableCount: totalUnavailable,
        noResponseCount: totalNoResponse,
        byPart: parts.map((part) => ({
          part,
          total: partCounts[part]?.total || 0,
          available: partCounts[part]?.available || 0,
          unavailable: partCounts[part]?.unavailable || 0,
          noResponse: partCounts[part]?.noResponse || 0,
        })),
      },
      nextServiceDate: nextSunday,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Conductor Status Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
