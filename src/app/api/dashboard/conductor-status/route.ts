import { NextResponse } from 'next/server';

import { formatDate, getNextSunday } from '@/lib/dashboard-context';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ArrangementStatus } from '@/types/database.types';

export interface PartSummary {
  part: string;
  total: number;
  available: number;
  unavailable: number;
  noResponse: number;
  /** 해당 파트의 마지막 출석 저장 시각 (ISO 문자열). 응답 없음(=행 없음)이면 null */
  lastUpdatedAt: string | null;
}

export interface AttendanceSummaryItem {
  serviceScheduleId: string | null;
  serviceType: string;
  serviceStartTime: string | null;
  totalMembers: number;
  availableCount: number;
  unavailableCount: number;
  noResponseCount: number;
  byPart: PartSummary[];
}

export interface ConductorStatusResponse {
  latestArrangement: {
    id: string;
    date: string;
    title: string;
    status: ArrangementStatus | null;
    seatCount: number;
    hasRowLeaders: boolean;
  } | null;
  /** @deprecated 하위 호환용 — 첫 번째 예배 기준. attendanceSummaries 사용 권장 */
  attendanceSummary: {
    totalMembers: number;
    availableCount: number;
    unavailableCount: number;
    noResponseCount: number;
    byPart: PartSummary[];
  };
  /** 예배별 출석 요약 (예배가 여러 개일 때 각각 독립 집계) */
  attendanceSummaries: AttendanceSummaryItem[];
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

    // 독립 쿼리 4개를 병렬 실행
    const [arrangementResult, activeMembersResult, attendancesResult, serviceSchedulesResult] = await Promise.all([
      // 1. 배치표 조회 (다음 주일만)
      adminSupabase
        .from('arrangements')
        .select('id, date, title, status')
        .eq('date', nextSunday)
        .maybeSingle()
        .then(({ data }) => data),

      // 2. 활동 중인 대원 목록
      adminSupabase
        .from('members')
        .select('id, part')
        .in('member_status', ['REGULAR', 'NEW'])
        .eq('is_singer', true),

      // 3. 출석 투표 데이터 (service_schedule_id 포함, updated_at으로 마지막 저장 시각 집계)
      adminSupabase
        .from('attendances')
        .select('member_id, is_service_available, service_schedule_id, updated_at')
        .eq('date', nextSunday),

      // 4. 해당 날짜 예배 일정
      adminSupabase
        .from('service_schedules')
        .select('id, service_type, service_start_time')
        .eq('date', nextSunday)
        .order('service_start_time', { ascending: true }),
    ]);

    const arrangement = arrangementResult;
    const { data: activeMembers } = activeMembersResult;
    const { data: attendances } = attendancesResult;
    const { data: serviceSchedules } = serviceSchedulesResult;

    // 배치표가 있으면 좌석 정보 조회 (arrangement.id에 의존)
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

    const parts = ['SOPRANO', 'ALTO', 'TENOR', 'BASS'];
    const totalMembers = activeMembers?.length || 0;

    // member_id → part 매핑 (파트별 lastUpdatedAt 계산용)
    const memberPartById = new Map<string, string>();
    activeMembers?.forEach((m) => memberPartById.set(m.id, m.part));

    // 예배별 출석 집계 함수
    function aggregateAttendance(
      filteredAttendances: {
        member_id: string;
        is_service_available: boolean;
        updated_at?: string | null;
      }[]
    ) {
      const attendanceMap = new Map(
        filteredAttendances.map((a) => [a.member_id, a.is_service_available])
      );

      const partCounts: Record<
        string,
        { total: number; available: number; unavailable: number; noResponse: number }
      > = {};
      parts.forEach((part) => {
        partCounts[part] = { total: 0, available: 0, unavailable: 0, noResponse: 0 };
      });

      // 파트별 MAX(updated_at) — 활성 대원의 응답만 집계 (다른 파트 옮긴 과거 응답 등 제외)
      const partLastUpdated: Record<string, string | null> = {
        SOPRANO: null,
        ALTO: null,
        TENOR: null,
        BASS: null,
      };
      filteredAttendances.forEach((a) => {
        const part = memberPartById.get(a.member_id);
        if (!part || !(part in partLastUpdated)) return;
        if (!a.updated_at) return;
        const prev = partLastUpdated[part];
        if (prev === null || a.updated_at > prev) {
          partLastUpdated[part] = a.updated_at;
        }
      });

      let totalAvailable = 0;
      let totalUnavailable = 0;

      activeMembers?.forEach((member) => {
        const part = member.part;
        if (!partCounts[part]) {
          partCounts[part] = { total: 0, available: 0, unavailable: 0, noResponse: 0 };
        }
        partCounts[part].total++;

        // 레코드 없음 = 기본 출석 (출석 관리 페이지와 동일한 로직)
        const isAvailable = attendanceMap.has(member.id)
          ? attendanceMap.get(member.id)
          : true;

        if (isAvailable) {
          partCounts[part].available++;
          totalAvailable++;
        } else {
          partCounts[part].unavailable++;
          totalUnavailable++;
        }
      });

      return {
        totalMembers,
        availableCount: totalAvailable,
        unavailableCount: totalUnavailable,
        noResponseCount: 0,
        byPart: parts.map((part) => ({
          part,
          total: partCounts[part]?.total || 0,
          available: partCounts[part]?.available || 0,
          unavailable: partCounts[part]?.unavailable || 0,
          noResponse: partCounts[part]?.noResponse || 0,
          lastUpdatedAt: partLastUpdated[part] ?? null,
        })),
      };
    }

    // 예배별 출석 요약 생성
    const allAttendances = attendances || [];
    let attendanceSummaries: AttendanceSummaryItem[];

    if (serviceSchedules && serviceSchedules.length > 0) {
      attendanceSummaries = serviceSchedules.map((schedule) => {
        // 해당 예배의 출석 데이터 필터 (service_schedule_id가 null인 레코드는 모든 예배에 포함)
        const filtered = allAttendances.filter(
          (a) => a.service_schedule_id === schedule.id || a.service_schedule_id === null
        );
        const agg = aggregateAttendance(filtered);
        return {
          serviceScheduleId: schedule.id,
          serviceType: schedule.service_type,
          serviceStartTime: schedule.service_start_time,
          ...agg,
        };
      });
    } else {
      // 예배 일정이 없으면 기존처럼 날짜 기준 단일 집계
      const agg = aggregateAttendance(allAttendances);
      attendanceSummaries = [{
        serviceScheduleId: null,
        serviceType: '예배',
        serviceStartTime: null,
        ...agg,
      }];
    }

    // 하위 호환용: 첫 번째 예배 기준 attendanceSummary
    const firstSummary = attendanceSummaries[0];

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
        totalMembers: firstSummary.totalMembers,
        availableCount: firstSummary.availableCount,
        unavailableCount: firstSummary.unavailableCount,
        noResponseCount: firstSummary.noResponseCount,
        byPart: firstSummary.byPart,
      },
      attendanceSummaries,
      nextServiceDate: nextSunday,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Conductor Status Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
