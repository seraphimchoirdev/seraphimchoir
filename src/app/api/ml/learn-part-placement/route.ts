/**
 * 파트 배치 규칙 학습 API
 * POST /api/ml/learn-part-placement
 *
 * 과거 배치 데이터를 분석하여 파트별 영역 배치 규칙을 학습합니다.
 * - 예배 유형별 분리 학습 (2부예배, 온세대예배 등)
 * - 인원수 구간별 분리 학습 (60-69, 70-79, 80-89 등)
 * - 학습된 규칙은 learned_part_placement_rules 테이블에 UPSERT
 */
import fs from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import {
  type ArrangementMetadata,
  type SeatDataForLearning,
  learnAllPartPlacementRules,
} from '@/lib/part-placement-learner';
import { createAdminClient } from '@/lib/supabase/server';

import type { Database } from '@/types/database.types';
import type { GridLayout } from '@/types/grid';

const logger = createLogger({ prefix: 'LearnPartPlacement' });

type Part = Database['public']['Enums']['part'];

/**
 * 예배 유형 정규화
 * DB에 저장된 다양한 형식의 예배 유형을 표준 형식으로 변환
 *
 * 표준 예배 유형 (UI 기준):
 * - '주일 2부 예배'
 * - '오후찬양예배'
 * - '절기찬양예배'
 * - '온세대예배'
 * - '기도회'
 * - '기타'
 */
function normalizeServiceType(serviceType: string | null): string {
  if (!serviceType) return '주일 2부 예배';

  const normalized = serviceType.trim();

  // 이미 표준 형식인 경우
  const standardTypes = [
    '주일 2부 예배',
    '오후찬양예배',
    '절기찬양예배',
    '온세대예배',
    '기도회',
    '기타',
  ];
  if (standardTypes.includes(normalized)) {
    return normalized;
  }

  // 레거시 형식 변환 (ml_output 파일명 패턴 포함)
  // 2부예배 계열: 2부예배, 2부주일예배, 신년예배2부 등
  if (
    normalized.includes('2부예배') ||
    normalized.includes('2부 예배') ||
    normalized.includes('2부주일') ||
    normalized.includes('신년예배')
  ) {
    return '주일 2부 예배';
  }
  // 온세대예배 (full 포함)
  if (normalized.includes('온세대')) {
    return '온세대예배';
  }
  // 오후찬양예배
  if (normalized.includes('오후찬양') || normalized.includes('오후 찬양')) {
    return '오후찬양예배';
  }
  // 절기/특별예배: 추수감사, 절기, 특별 등
  if (
    normalized.includes('절기') ||
    normalized.includes('특별') ||
    normalized.includes('추수감사') ||
    normalized.includes('부활') ||
    normalized.includes('성탄')
  ) {
    return '절기찬양예배';
  }
  // 기도회
  if (normalized.includes('기도회')) {
    return '기도회';
  }

  return '주일 2부 예배';
}

/**
 * 파일명에서 예배 유형 추출
 * 예: "ml_2025-01-05_2부예배.json" → "2부예배"
 */
function extractServiceTypeFromFilename(filename: string): string {
  // ml_YYYY-MM-DD_예배유형.json 패턴에서 예배유형 추출
  const match = filename.match(/ml_\d{4}-\d{2}-\d{2}_(.+)\.json$/);
  if (match) {
    return normalizeServiceType(match[1]);
  }
  return '주일 2부 예배';
}

/** DB에서 로드된 규칙 (임시 타입, 마이그레이션 후 타입 재생성 필요) */
interface LearnedPartPlacementRuleRow {
  id: string;
  service_type: string;
  member_count_range: string;
  part: Part;
  side: 'left' | 'right' | 'both';
  preferred_rows: number[];
  overflow_rows: number[];
  forbidden_rows: number[];
  row_distribution: Record<string, number>;
  side_percentage: number;
  front_row_percentage: number;
  sample_count: number;
  total_seats_analyzed: number;
  confidence_score: number | null;
  last_learned_at: string;
  created_at: string;
  // 열 패턴 관련 필드
  col_range_by_row?: Record<string, { min: number; max: number; avg: number; count: number }>;
  avg_col?: number | null;
  col_consistency?: number | null;
}

/** ML 출력 파일 구조 */
interface MLOutputFile {
  arrangement_id: string;
  date: string;
  grid_layout: {
    rows: number;
    row_capacities: number[];
    zigzag_pattern: string;
  };
  metadata?: {
    service_type?: string;
  };
  seats: Array<{
    member_id: string;
    member_name: string;
    part: Part;
    row: number;
    col: number;
  }>;
}

/**
 * ml_output 디렉토리에서 모든 JSON 파일을 읽어 학습 데이터로 변환
 */
function loadDataFromMLOutputFiles(): {
  seats: SeatDataForLearning[];
  arrangements: ArrangementMetadata[];
} {
  const mlOutputDir = path.join(process.cwd(), 'training_data', 'ml_output');

  if (!fs.existsSync(mlOutputDir)) {
    throw new Error(`ml_output 디렉토리를 찾을 수 없습니다: ${mlOutputDir}`);
  }

  const files = fs.readdirSync(mlOutputDir).filter((f) => f.endsWith('.json'));
  logger.debug(`[learn-part-placement] ml_output에서 ${files.length}개 파일 발견`);

  const allSeats: SeatDataForLearning[] = [];
  const allArrangements: ArrangementMetadata[] = [];

  for (const filename of files) {
    const filePath = path.join(mlOutputDir, filename);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data: MLOutputFile = JSON.parse(fileContent);

    // 파일명에서 예배 유형 추출 (메타데이터보다 파일명이 더 정확)
    const serviceType = extractServiceTypeFromFilename(filename);

    // GridLayout 변환 (snake_case → camelCase)
    const gridLayout: GridLayout = {
      rows: data.grid_layout.rows,
      rowCapacities: data.grid_layout.row_capacities,
      zigzagPattern: (data.grid_layout.zigzag_pattern || 'even') as 'even' | 'odd' | 'none',
    };

    // 배치 메타데이터 추가
    allArrangements.push({
      arrangement_id: data.arrangement_id,
      service_type: serviceType,
      total_members: data.seats.length,
      grid_layout: gridLayout,
    });

    // 좌석 데이터 변환
    for (const seat of data.seats) {
      allSeats.push({
        arrangement_id: data.arrangement_id,
        seat_row: seat.row,
        seat_column: seat.col,
        part: seat.part,
      });
    }
  }

  return { seats: allSeats, arrangements: allArrangements };
}

export async function POST(request: NextRequest) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);

  // source=files 이면 ml_output 파일에서 직접 로드, 아니면 DB에서 로드
  const source = searchParams.get('source') || 'db';

  try {
    logger.debug(`[learn-part-placement] 파트 배치 규칙 학습 시작... (source: ${source})`);

    let seats: SeatDataForLearning[];
    let arrangements: ArrangementMetadata[];

    if (source === 'files') {
      // ===== 파일에서 직접 로드 =====
      const fileData = loadDataFromMLOutputFiles();
      seats = fileData.seats;
      arrangements = fileData.arrangements;

      logger.debug(
        `[learn-part-placement] ${arrangements.length}개 배치, ${seats.length}개 좌석 데이터 (파일)`
      );
    } else {
      // ===== DB에서 로드 (기존 방식) =====
      // 1. 모든 배치 메타데이터 조회 (ml_arrangement_history)
      const { data: arrangementHistories, error: historyError } = await supabase
        .from('ml_arrangement_history')
        .select('arrangement_id, service_type, total_members, grid_layout');

      if (historyError) {
        logger.error('[learn-part-placement] ML 히스토리 조회 오류:', historyError);
        return NextResponse.json(
          { error: 'ML 히스토리 조회 실패', details: historyError.message },
          { status: 500 }
        );
      }

      if (!arrangementHistories || arrangementHistories.length === 0) {
        return NextResponse.json(
          { error: '학습할 배치 데이터가 없습니다', stats: { totalArrangements: 0 } },
          { status: 400 }
        );
      }

      logger.debug(
        `[learn-part-placement] ${arrangementHistories.length}개 배치 메타데이터 로드 완료`
      );

      // 2. 배치 ID 목록 추출
      const arrangementIds = arrangementHistories.map((h) => h.arrangement_id);

      // 3. 모든 좌석 데이터 조회
      const { data: allSeats, error: seatsError } = await supabase
        .from('seats')
        .select('arrangement_id, seat_row, seat_column, part')
        .in('arrangement_id', arrangementIds);

      if (seatsError) {
        logger.error('[learn-part-placement] 좌석 데이터 조회 오류:', seatsError);
        return NextResponse.json(
          { error: '좌석 데이터 조회 실패', details: seatsError.message },
          { status: 500 }
        );
      }

      if (!allSeats || allSeats.length === 0) {
        return NextResponse.json(
          { error: '좌석 데이터가 없습니다', stats: { totalSeats: 0 } },
          { status: 400 }
        );
      }

      logger.debug(`[learn-part-placement] ${allSeats.length}개 좌석 데이터 로드 완료`);

      // 4. 데이터 변환
      seats = allSeats.map((seat) => ({
        arrangement_id: seat.arrangement_id,
        seat_row: seat.seat_row,
        seat_column: seat.seat_column,
        part: seat.part,
      }));

      arrangements = arrangementHistories.map((h) => {
        // grid_layout이 없으면 기본값 사용
        const rawLayout = h.grid_layout as Record<string, unknown> | null;
        let gridLayout: GridLayout;

        if (rawLayout) {
          // DB에 저장된 형식에 따라 rowCapacities 또는 row_capacities 처리
          const rows = (rawLayout.rows as number) || 6;
          const rowCapacities =
            (rawLayout.rowCapacities as number[]) ||
            (rawLayout.row_capacities as number[]) ||
            Array(rows).fill(8);
          const zigzagPattern = ((rawLayout.zigzagPattern as string) ||
            (rawLayout.zigzag_pattern as string) ||
            'even') as 'even' | 'odd' | 'none';

          gridLayout = { rows, rowCapacities, zigzagPattern };
        } else {
          gridLayout = {
            rows: 6,
            rowCapacities: [8, 8, 8, 8, 8, 8],
            zigzagPattern: 'even',
          };
        }

        return {
          arrangement_id: h.arrangement_id,
          service_type: normalizeServiceType(h.service_type),
          total_members: h.total_members || 0,
          grid_layout: gridLayout,
        };
      });
    }

    // 5. 학습 알고리즘 실행
    logger.debug('[learn-part-placement] 학습 알고리즘 실행 중...');
    const learningResult = learnAllPartPlacementRules({ seats, arrangements });

    logger.debug(`[learn-part-placement] 학습 완료:`, learningResult.stats);

    // 6. 학습된 규칙 DB에 UPSERT
    if (learningResult.rules.length > 0) {
      logger.debug(`[learn-part-placement] ${learningResult.rules.length}개 규칙 DB 저장 중...`);

      // UPSERT: service_type + member_count_range + part 조합이 unique
      // Note: 마이그레이션 적용 후 타입 재생성 필요 (npx supabase gen types typescript)
      for (const rule of learningResult.rules) {
        const { error: upsertError } = await (
          supabase as unknown as {
            from: (table: string) => {
              upsert: (
                data: unknown,
                options: unknown
              ) => Promise<{ error: { message: string } | null }>;
            };
          }
        )
          .from('learned_part_placement_rules')
          .upsert(
            {
              service_type: rule.service_type,
              member_count_range: rule.member_count_range,
              part: rule.part,
              side: rule.side,
              preferred_rows: rule.preferred_rows,
              overflow_rows: rule.overflow_rows,
              forbidden_rows: rule.forbidden_rows,
              row_distribution: rule.row_distribution,
              side_percentage: rule.side_percentage,
              front_row_percentage: rule.front_row_percentage,
              sample_count: rule.sample_count,
              total_seats_analyzed: rule.total_seats_analyzed,
              confidence_score: rule.confidence_score,
              // 열 패턴 데이터 (Phase 2 추가)
              col_range_by_row: rule.col_range_by_row,
              avg_col: rule.avg_col,
              col_consistency: rule.col_consistency,
              last_learned_at: new Date().toISOString(),
            },
            {
              onConflict: 'service_type,member_count_range,part',
            }
          );

        if (upsertError) {
          logger.error('[learn-part-placement] 규칙 저장 오류:', upsertError, rule);
        }
      }

      logger.debug('[learn-part-placement] DB 저장 완료');
    }

    // 7. 학습 결과 반환
    return NextResponse.json({
      success: true,
      source,
      stats: learningResult.stats,
      rulesPreview: learningResult.rules.slice(0, 10).map((r) => ({
        group: `${r.service_type} / ${r.member_count_range}`,
        part: r.part,
        side: r.side,
        preferredRows: r.preferred_rows,
        forbiddenRows: r.forbidden_rows,
        confidence: r.confidence_score,
        // 열 패턴 데이터 미리보기
        avgCol: r.avg_col,
        colConsistency: r.col_consistency,
        colRangeByRow: r.col_range_by_row,
      })),
    });
  } catch (error) {
    logger.error('[learn-part-placement] 예외 발생:', error);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { error: '학습 중 오류 발생', ...(isDev && { details: String(error) }) },
      { status: 500 }
    );
  }
}

/**
 * GET: 현재 학습된 규칙 조회
 */
export async function GET(request: NextRequest) {
  const supabase = await createAdminClient();

  try {
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get('serviceType');
    const memberCountRange = searchParams.get('memberCountRange');

    // Note: learned_part_placement_rules 테이블 타입이 database.types.ts에 없으므로
    // 타입 안전성을 위해 결과에만 타입을 적용
    type QueryResult = {
      data: LearnedPartPlacementRuleRow[] | null;
      error: { message: string } | null;
    };

    // 쿼리 실행 (타입 미정의 테이블이므로 any 사용 후 결과에 타입 적용)
    const result = await supabase
      .from('learned_part_placement_rules' as unknown as 'members')
      .select('*')
      .order('service_type')
      .order('member_count_range')
      .order('part')
      .match({
        ...(serviceType && { service_type: serviceType }),
        ...(memberCountRange && { member_count_range: memberCountRange }),
      });

    const { data, error } = result as unknown as QueryResult;

    if (error) {
      logger.error('Learn part placement query error:', error);
      const isDev = process.env.NODE_ENV === 'development';
      return NextResponse.json(
        { error: '규칙 조회 실패', ...(isDev && { details: error.message }) },
        { status: 500 }
      );
    }

    // 그룹별로 정리
    const groupedRules: Record<string, Record<string, unknown>> = {};
    for (const rule of data || []) {
      const groupKey = `${rule.service_type} / ${rule.member_count_range}`;
      if (!groupedRules[groupKey]) {
        groupedRules[groupKey] = {
          serviceType: rule.service_type,
          memberCountRange: rule.member_count_range,
          parts: {},
        };
      }
      (groupedRules[groupKey].parts as Record<string, unknown>)[rule.part] = {
        side: rule.side,
        preferredRows: rule.preferred_rows,
        overflowRows: rule.overflow_rows,
        forbiddenRows: rule.forbidden_rows,
        sidePercentage: rule.side_percentage,
        frontRowPercentage: rule.front_row_percentage,
        sampleCount: rule.sample_count,
        confidence: rule.confidence_score,
        // 열 패턴 데이터
        avgCol: rule.avg_col,
        colConsistency: rule.col_consistency,
        colRangeByRow: rule.col_range_by_row,
      };
    }

    return NextResponse.json({
      totalGroups: Object.keys(groupedRules).length,
      totalRules: data?.length || 0,
      groups: groupedRules,
    });
  } catch (error) {
    logger.error('[learn-part-placement] GET 오류:', error);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { error: '조회 중 오류 발생', ...(isDev && { details: String(error) }) },
      { status: 500 }
    );
  }
}
