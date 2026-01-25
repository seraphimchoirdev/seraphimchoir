/**
 * 등단 통계 API
 * ml_arrangement_history 테이블에서 실제 배치 인원 통계를 조회합니다.
 */
import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

import type {
  DailyStageStats,
  MonthlyTrendStats,
  Part,
  PartAverageStats,
  StageStatisticsResponse,
  StageStatsSummary,
} from '@/types/stage-stats.types';

const logger = createLogger({ prefix: 'ArrangementsStats' });

/** DB에서 반환되는 ml_arrangement_history 레코드 타입 */
interface MLHistoryRecord {
  date: string;
  service_type: string | null;
  total_members: number;
  part_breakdown: Record<string, number>;
}

/**
 * GET /api/arrangements/stats
 * 등단 통계 조회
 *
 * Query params:
 * - start_date: 시작 날짜 (YYYY-MM-DD, 필수)
 * - end_date: 종료 날짜 (YYYY-MM-DD, 필수)
 * - service_type: 예배 유형 필터 (선택)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const serviceType = searchParams.get('service_type');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '시작 날짜와 종료 날짜는 필수입니다' }, { status: 400 });
    }

    // ml_arrangement_history 테이블에서 데이터 조회
    let query = supabase
      .from('ml_arrangement_history')
      .select('date, service_type, total_members, part_breakdown')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    // 예배 유형 필터 적용
    if (serviceType && serviceType !== '전체') {
      // "2부예배" 선택 시 "2부주일예배", "온세대예배 (주일2부예배) - 새로핌 전용" 등도 포함
      // 단, "온세대예배 (주일2부예배)" full 버전은 제외 (온세대 전체 인원이므로)
      if (serviceType === '2부예배') {
        query = query
          .ilike('service_type', '%2부예배%')
          .neq('service_type', '온세대예배 (주일2부예배)');
      } else {
        query = query.eq('service_type', serviceType);
      }
    }

    const { data: records, error } = await query;

    if (error) {
      logger.error('ML history query error:', error);
      return NextResponse.json({ error: `등단 이력 조회 실패: ${error.message}` }, { status: 500 });
    }

    if (!records || records.length === 0) {
      // 빈 데이터 응답
      return NextResponse.json({
        summary: {
          totalServices: 0,
          averageMembers: 0,
          maxDate: '',
          maxCount: 0,
          maxServiceType: null,
          minDate: '',
          minCount: 0,
          minServiceType: null,
        },
        partAverages: {
          SOPRANO: { average: 0, percentage: 0, total: 0 },
          ALTO: { average: 0, percentage: 0, total: 0 },
          TENOR: { average: 0, percentage: 0, total: 0 },
          BASS: { average: 0, percentage: 0, total: 0 },
        },
        monthlyTrend: [],
        dailyStats: [],
        serviceTypes: [],
      } as StageStatisticsResponse);
    }

    const historyRecords = records as MLHistoryRecord[];

    // 통계 계산
    const response = calculateStatistics(historyRecords);

    // 사용 가능한 예배 유형 목록 조회 (필터링 없이 전체)
    const { data: allServiceTypes } = await supabase
      .from('ml_arrangement_history')
      .select('service_type')
      .gte('date', startDate)
      .lte('date', endDate)
      .not('service_type', 'is', null);

    const uniqueServiceTypes = [
      ...new Set(
        (allServiceTypes || []).map((r) => r.service_type).filter((st): st is string => st !== null)
      ),
    ].sort();

    response.serviceTypes = uniqueServiceTypes;

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Stage stats error:', error);
    return NextResponse.json({ error: '등단 통계 조회에 실패했습니다' }, { status: 500 });
  }
}

/**
 * 통계 계산 함수
 */
function calculateStatistics(records: MLHistoryRecord[]): StageStatisticsResponse {
  const totalServices = records.length;
  const totalMembersSum = records.reduce((sum, r) => sum + r.total_members, 0);
  const averageMembers = totalMembersSum / totalServices;

  // 파트별 합계
  const partTotals: Record<Part, number> = {
    SOPRANO: 0,
    ALTO: 0,
    TENOR: 0,
    BASS: 0,
  };

  // 파트명 정규화 (한글 → 영문)
  const normalizePartName = (part: string): Part | null => {
    const mapping: Record<string, Part> = {
      소프라노: 'SOPRANO',
      알토: 'ALTO',
      테너: 'TENOR',
      베이스: 'BASS',
      SOPRANO: 'SOPRANO',
      ALTO: 'ALTO',
      TENOR: 'TENOR',
      BASS: 'BASS',
    };
    return mapping[part] || null;
  };

  // 파트별 합계 계산
  for (const record of records) {
    if (record.part_breakdown) {
      for (const [partKey, count] of Object.entries(record.part_breakdown)) {
        const normalizedPart = normalizePartName(partKey);
        if (normalizedPart && typeof count === 'number') {
          partTotals[normalizedPart] += count;
        }
      }
    }
  }

  // 파트별 평균 및 비율 계산
  const totalPartSum = Object.values(partTotals).reduce((a, b) => a + b, 0);
  const partAverages: Record<Part, PartAverageStats> = {} as Record<Part, PartAverageStats>;

  for (const part of ['SOPRANO', 'ALTO', 'TENOR', 'BASS'] as Part[]) {
    partAverages[part] = {
      average: Math.round((partTotals[part] / totalServices) * 10) / 10,
      percentage: totalPartSum > 0 ? Math.round((partTotals[part] / totalPartSum) * 1000) / 10 : 0,
      total: partTotals[part],
    };
  }

  // 최대/최소 등단일 찾기
  let maxRecord = records[0];
  let minRecord = records[0];

  for (const record of records) {
    if (record.total_members > maxRecord.total_members) {
      maxRecord = record;
    }
    if (record.total_members < minRecord.total_members) {
      minRecord = record;
    }
  }

  // 월별 추이 계산
  const monthlyMap = new Map<string, { serviceCount: number; totalMembers: number }>();

  for (const record of records) {
    const month = record.date.substring(0, 7); // YYYY-MM
    const existing = monthlyMap.get(month) || { serviceCount: 0, totalMembers: 0 };
    monthlyMap.set(month, {
      serviceCount: existing.serviceCount + 1,
      totalMembers: existing.totalMembers + record.total_members,
    });
  }

  const monthlyTrend: MonthlyTrendStats[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      serviceCount: data.serviceCount,
      averageMembers: Math.round((data.totalMembers / data.serviceCount) * 10) / 10,
      totalMembers: data.totalMembers,
    }));

  // 일별 상세 (역순 - 최신 순)
  const dailyStats: DailyStageStats[] = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((record) => {
      // 파트별 인원 정규화
      const normalizedBreakdown: Record<Part, number> = {
        SOPRANO: 0,
        ALTO: 0,
        TENOR: 0,
        BASS: 0,
      };

      if (record.part_breakdown) {
        for (const [partKey, count] of Object.entries(record.part_breakdown)) {
          const normalizedPart = normalizePartName(partKey);
          if (normalizedPart && typeof count === 'number') {
            normalizedBreakdown[normalizedPart] = count;
          }
        }
      }

      return {
        date: record.date,
        serviceType: record.service_type,
        totalMembers: record.total_members,
        partBreakdown: normalizedBreakdown,
      };
    });

  const summary: StageStatsSummary = {
    totalServices,
    averageMembers: Math.round(averageMembers * 10) / 10,
    maxDate: maxRecord.date,
    maxCount: maxRecord.total_members,
    maxServiceType: maxRecord.service_type,
    minDate: minRecord.date,
    minCount: minRecord.total_members,
    minServiceType: minRecord.service_type,
  };

  return {
    summary,
    partAverages,
    monthlyTrend,
    dailyStats,
    serviceTypes: [],
  };
}
