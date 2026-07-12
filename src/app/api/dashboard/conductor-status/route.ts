import { NextResponse } from 'next/server';

import { fetchConductorStatus } from '@/lib/dashboard-data';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ArrangementStatus } from '@/types';

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

    const adminSupabase = await createAdminClient();
    const response = await fetchConductorStatus(adminSupabase);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Conductor Status Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
