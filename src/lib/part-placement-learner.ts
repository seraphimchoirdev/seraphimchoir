/**
 * Part Placement Learner
 *
 * 과거 배치 데이터를 분석하여 파트별 영역 배치 규칙을 학습합니다.
 * 예배 유형 및 인원수 구간별로 분리 학습하여 정교한 배치 규칙을 생성합니다.
 *
 * 설계 원칙:
 * - 하드코딩된 제약 조건 없음 (순수 데이터 기반 학습)
 * - ALTO 5-6행 금지 등의 패턴은 과거 데이터에서 자연스럽게 학습됨
 * - forbidden_rows는 0% 배치된 행에서 자동 추출
 */
import type { Database } from '@/types/database.types';
import type { GridLayout } from '@/types/grid';

type Part = Database['public']['Enums']['part'];

/** 행별 열 통계 */
export interface ColumnStats {
  min: number;
  max: number;
  avg: number;
  count: number;
}

/** 파트별 열 패턴 */
export interface PartColumnPattern {
  /** 행별 열 범위 통계 */
  colRangeByRow: Record<number, ColumnStats>;
  /** 전체 평균 열 위치 */
  avgCol: number;
  /** 열 배치 일관성 점수 (0-1, 높을수록 일관됨) */
  colConsistency: number;
}

/** 파트 경계선 정보 */
export interface BoundaryInfo {
  row: number;
  leftPart: Part;
  rightPart: Part;
  boundaryCol: number;
  overlapWidth: number;
}

/** 학습된 파트 배치 규칙 */
export interface LearnedPartRule {
  part: Part;
  /** 선호 측면 ('left' | 'right' | 'both') */
  side: 'left' | 'right' | 'both';
  /** 선호 행 순서 (빈도 내림차순) */
  preferredRows: number[];
  /** 오버플로우 행 (5% 미만 배치) */
  overflowRows: number[];
  /** 금지 행 (0% 배치) */
  forbiddenRows: number[];
  /** 행별 분포 비율 (%) */
  rowDistribution: Record<number, number>;
  /** 해당 측면 배치 비율 (0-100) */
  sidePercentage: number;
  /** 앞줄(1-3행) 배치 비율 (0-100) */
  frontRowPercentage: number;
  /** 학습에 사용된 샘플 수 */
  sampleCount: number;
  /** 분석된 총 좌석 수 */
  totalSeatsAnalyzed: number;
  /** 신뢰도 점수 (0-1) */
  confidenceScore: number;
  // 열 패턴 관련 필드 (Phase 2 추가)
  /** 행별 열 범위 통계 */
  colRangeByRow?: Record<number, ColumnStats>;
  /** 전체 평균 열 위치 */
  avgCol?: number;
  /** 열 배치 일관성 점수 */
  colConsistency?: number;
}

/** 학습 결과 (DB 저장용) */
export interface LearnedRuleRecord {
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
  confidence_score: number;
  // 열 패턴 관련 필드 (Phase 2 추가)
  col_range_by_row?: Record<string, ColumnStats>;
  boundary_info?: Record<string, BoundaryInfo>;
  avg_col?: number;
  col_consistency?: number;
}

/** 좌석 데이터 입력 타입 */
export interface SeatDataForLearning {
  seat_row: number; // 1-based
  seat_column: number; // 1-based
  part: Part;
  arrangement_id: string;
}

/** 배치 메타데이터 */
export interface ArrangementMetadata {
  arrangement_id: string;
  service_type: string;
  total_members: number;
  grid_layout: GridLayout;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 총 인원수에서 구간 문자열 계산
 * @example getMemberCountRange(75) => "70-79"
 */
export function getMemberCountRange(totalMembers: number): string {
  const lower = Math.floor(totalMembers / 10) * 10;
  return `${lower}-${lower + 9}`;
}

/**
 * 신뢰도 점수 계산
 * - 샘플 수가 많을수록 높은 신뢰도
 * - 10개 미만: 낮은 신뢰도, 30개 이상: 높은 신뢰도
 */
function calculateConfidenceScore(sampleCount: number, totalSeats: number): number {
  // 샘플 수 기반 기본 점수 (0-0.6)
  const sampleScore = Math.min(sampleCount / 30, 1) * 0.6;

  // 좌석 수 기반 추가 점수 (0-0.4)
  // 100석 이상이면 만점
  const seatScore = Math.min(totalSeats / 100, 1) * 0.4;

  return Math.round((sampleScore + seatScore) * 10000) / 10000;
}

/**
 * 행별 분포 비율 계산
 */
function calculateRowDistribution(
  rowCounts: Record<number, number>,
  totalSeats: number
): Record<number, number> {
  const distribution: Record<number, number> = {};

  for (const [row, count] of Object.entries(rowCounts)) {
    const percentage = totalSeats > 0 ? (count / totalSeats) * 100 : 0;
    distribution[Number(row)] = Math.round(percentage * 100) / 100;
  }

  return distribution;
}

/**
 * 측면 결정 (좌측/우측/양측)
 * - 70% 이상이면 해당 측면으로 확정
 * - 그 외에는 'both'
 */
function determineSide(
  seats: SeatDataForLearning[],
  gridLayouts: Map<string, GridLayout>
): { side: 'left' | 'right' | 'both'; percentage: number } {
  if (seats.length === 0) {
    return { side: 'both', percentage: 50 };
  }

  let leftCount = 0;
  let rightCount = 0;

  for (const seat of seats) {
    const layout = gridLayouts.get(seat.arrangement_id);
    if (!layout) continue;

    // 해당 행의 최대 열 수
    const rowCapacity = layout.rowCapacities[seat.seat_row - 1] || 0;
    if (rowCapacity === 0) continue;

    // 중앙점 (1-based)
    const midCol = Math.ceil(rowCapacity / 2);

    if (seat.seat_column < midCol) {
      leftCount++;
    } else {
      rightCount++;
    }
  }

  const total = leftCount + rightCount;
  if (total === 0) {
    return { side: 'both', percentage: 50 };
  }

  const leftPercentage = (leftCount / total) * 100;
  const rightPercentage = (rightCount / total) * 100;

  // 70% 이상이면 해당 측면으로 확정
  if (leftPercentage >= 70) {
    return { side: 'left', percentage: Math.round(leftPercentage * 100) / 100 };
  } else if (rightPercentage >= 70) {
    return { side: 'right', percentage: Math.round(rightPercentage * 100) / 100 };
  }

  // 큰 쪽의 비율 반환
  return {
    side: 'both',
    percentage: Math.round(Math.max(leftPercentage, rightPercentage) * 100) / 100,
  };
}

/**
 * 앞줄(1-3행) 배치 비율 계산
 */
function calculateFrontRowPercentage(rowDistribution: Record<number, number>): number {
  const frontRowPercentage =
    (rowDistribution[1] || 0) + (rowDistribution[2] || 0) + (rowDistribution[3] || 0);
  return Math.round(frontRowPercentage * 100) / 100;
}

// ============================================================================
// 열(Column) 패턴 분석 함수
// ============================================================================

/**
 * 파트별 열 패턴 분석
 *
 * 각 파트에 대해 행별 열 분포를 분석하여 좌우 배치 경계를 학습합니다.
 *
 * @param seats - 파트의 좌석 데이터 배열
 * @param maxRows - 분석할 최대 행 수
 * @returns 파트의 열 패턴
 */
function analyzeColumnPatternForPart(
  seats: SeatDataForLearning[],
  maxRows: number = 6
): PartColumnPattern {
  // 행별 열 통계를 위한 임시 저장소
  const rowColData: Record<number, number[]> = {};

  // 전체 열 위치 합계 (평균 계산용)
  let totalColSum = 0;

  for (const seat of seats) {
    if (seat.seat_row > maxRows) continue;

    if (!rowColData[seat.seat_row]) {
      rowColData[seat.seat_row] = [];
    }
    rowColData[seat.seat_row].push(seat.seat_column);
    totalColSum += seat.seat_column;
  }

  // 행별 열 통계 계산
  const colRangeByRow: Record<number, ColumnStats> = {};

  for (const [row, cols] of Object.entries(rowColData)) {
    const rowNum = Number(row);
    if (cols.length === 0) continue;

    const min = Math.min(...cols);
    const max = Math.max(...cols);
    const avg = cols.reduce((a, b) => a + b, 0) / cols.length;

    colRangeByRow[rowNum] = {
      min,
      max,
      avg: Math.round(avg * 100) / 100,
      count: cols.length,
    };
  }

  // 전체 평균 열 위치
  const avgCol = seats.length > 0 ? Math.round((totalColSum / seats.length) * 100) / 100 : 0;

  // 열 배치 일관성 점수 계산
  const colConsistency = calculateColConsistency(colRangeByRow);

  return {
    colRangeByRow,
    avgCol,
    colConsistency,
  };
}

/**
 * 열 배치 일관성 점수 계산
 *
 * 행별 평균 열 위치의 표준편차를 기반으로 일관성 점수 계산
 * - 표준편차가 작을수록 높은 점수 (0-1)
 *
 * @param colRangeByRow - 행별 열 통계
 * @returns 일관성 점수 (0-1)
 */
function calculateColConsistency(colRangeByRow: Record<number, ColumnStats>): number {
  const avgCols = Object.values(colRangeByRow)
    .filter((stats) => stats.count > 0)
    .map((stats) => stats.avg);

  if (avgCols.length < 2) {
    return 1; // 데이터 부족 시 완전 일관성으로 가정
  }

  // 평균 계산
  const mean = avgCols.reduce((a, b) => a + b, 0) / avgCols.length;

  // 표준편차 계산
  const variance = avgCols.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / avgCols.length;
  const stdDev = Math.sqrt(variance);

  // 표준편차를 0-1 점수로 변환
  // 표준편차 0 → 점수 1, 표준편차 5 이상 → 점수 0에 가까움
  const consistency = Math.max(0, 1 - stdDev / 5);

  return Math.round(consistency * 1000) / 1000;
}

/**
 * 특정 행의 파트 경계선 계산
 *
 * 좌측 파트와 우측 파트의 열 범위가 겹치는 지점을 경계선으로 계산
 *
 * @param leftPartSeats - 좌측 파트 좌석들
 * @param rightPartSeats - 우측 파트 좌석들
 * @param row - 분석할 행 번호
 * @param leftPart - 좌측 파트 이름
 * @param rightPart - 우측 파트 이름
 * @returns 경계선 정보 또는 null
 */
function calculateBoundaryForRow(
  leftPartSeats: SeatDataForLearning[],
  rightPartSeats: SeatDataForLearning[],
  row: number,
  leftPart: Part,
  rightPart: Part
): BoundaryInfo | null {
  // 해당 행의 좌석만 필터링
  const leftSeatsInRow = leftPartSeats.filter((s) => s.seat_row === row);
  const rightSeatsInRow = rightPartSeats.filter((s) => s.seat_row === row);

  if (leftSeatsInRow.length === 0 || rightSeatsInRow.length === 0) {
    return null;
  }

  // 좌측 파트의 최대 열
  const leftMaxCol = Math.max(...leftSeatsInRow.map((s) => s.seat_column));
  // 우측 파트의 최소 열
  const rightMinCol = Math.min(...rightSeatsInRow.map((s) => s.seat_column));

  // 경계선 = (좌측 최대 + 우측 최소) / 2
  const boundaryCol = Math.round(((leftMaxCol + rightMinCol) / 2) * 10) / 10;

  // 오버랩 = 좌측 최대 - 우측 최소 + 1 (음수면 간격 있음)
  const overlapWidth = leftMaxCol - rightMinCol + 1;

  return {
    row,
    leftPart,
    rightPart,
    boundaryCol,
    overlapWidth: Math.max(0, overlapWidth),
  };
}

/**
 * 모든 행의 파트 경계선 계산
 *
 * @param seatsByPart - 파트별 좌석 데이터
 * @param maxRows - 분석할 최대 행 수
 * @returns 행별 경계선 정보 Map
 */
function _calculateAllBoundaries(
  seatsByPart: Map<Part, SeatDataForLearning[]>,
  maxRows: number = 6
): Record<number, BoundaryInfo> {
  const boundaries: Record<number, BoundaryInfo> = {};

  // 1-3행: SOPRANO(좌) - ALTO(우)
  const sopranoSeats = seatsByPart.get('SOPRANO') || [];
  const altoSeats = seatsByPart.get('ALTO') || [];

  for (let row = 1; row <= 3; row++) {
    const boundary = calculateBoundaryForRow(sopranoSeats, altoSeats, row, 'SOPRANO', 'ALTO');
    if (boundary) {
      boundaries[row] = boundary;
    }
  }

  // 4행: 혼합 구간 (오버플로우)
  // 여러 파트가 섞일 수 있어 별도 처리 가능

  // 5-6행: TENOR(좌) - BASS(우)
  const tenorSeats = seatsByPart.get('TENOR') || [];
  const bassSeats = seatsByPart.get('BASS') || [];

  for (let row = 5; row <= Math.min(6, maxRows); row++) {
    const boundary = calculateBoundaryForRow(tenorSeats, bassSeats, row, 'TENOR', 'BASS');
    if (boundary) {
      boundaries[row] = boundary;
    }
  }

  return boundaries;
}

// ============================================================================
// 핵심 학습 함수
// ============================================================================

/**
 * 단일 그룹(예배유형 + 인원수구간)의 파트별 배치 규칙 학습
 *
 * @param seats - 해당 그룹의 모든 좌석 데이터
 * @param gridLayouts - 배치 ID별 그리드 레이아웃 Map
 * @param maxRows - 분석할 최대 행 수 (기본: 6)
 * @returns 파트별 학습된 규칙 Map
 */
export function learnPartPlacementRulesFromGroup(
  seats: SeatDataForLearning[],
  gridLayouts: Map<string, GridLayout>,
  maxRows: number = 6
): Map<Part, LearnedPartRule> {
  const rules = new Map<Part, LearnedPartRule>();

  // 파트별로 좌석 그룹화
  const seatsByPart = new Map<Part, SeatDataForLearning[]>();
  const arrangementIds = new Set<string>();

  for (const seat of seats) {
    arrangementIds.add(seat.arrangement_id);

    if (!seatsByPart.has(seat.part)) {
      seatsByPart.set(seat.part, []);
    }
    seatsByPart.get(seat.part)!.push(seat);
  }

  const sampleCount = arrangementIds.size;

  // 각 파트별 규칙 학습
  const parts: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];

  for (const part of parts) {
    const partSeats = seatsByPart.get(part) || [];
    const totalSeats = partSeats.length;

    if (totalSeats === 0) {
      // 데이터 없으면 빈 규칙 (기본값 사용하도록)
      rules.set(part, createEmptyRule(part));
      continue;
    }

    // 행별 카운트 집계
    const rowCounts: Record<number, number> = {};
    for (const seat of partSeats) {
      const row = seat.seat_row;
      rowCounts[row] = (rowCounts[row] || 0) + 1;
    }

    // 행별 분포 비율 계산
    const rowDistribution = calculateRowDistribution(rowCounts, totalSeats);

    // 측면 결정
    const { side, percentage: sidePercentage } = determineSide(partSeats, gridLayouts);

    // 선호 행 / 오버플로우 행 / 금지 행 분류
    const preferredRows: number[] = [];
    const overflowRows: number[] = [];
    const forbiddenRows: number[] = [];

    // 1 ~ maxRows까지 분류
    const sortedRows = Object.entries(rowDistribution)
      .filter(([row]) => Number(row) <= maxRows)
      .sort((a, b) => b[1] - a[1]); // 빈도 내림차순

    for (let row = 1; row <= maxRows; row++) {
      const percentage = rowDistribution[row] || 0;

      if (percentage === 0) {
        // 0% 배치 → 금지 행 (데이터에서 학습)
        forbiddenRows.push(row);
      } else if (percentage < 5) {
        // 5% 미만 → 오버플로우 행
        overflowRows.push(row);
      }
    }

    // 선호 행: 빈도 내림차순 (금지/오버플로우 제외)
    for (const [row] of sortedRows) {
      const rowNum = Number(row);
      if (!forbiddenRows.includes(rowNum) && !overflowRows.includes(rowNum)) {
        preferredRows.push(rowNum);
      }
    }

    // 앞줄 배치 비율
    const frontRowPercentage = calculateFrontRowPercentage(rowDistribution);

    // 신뢰도 점수
    const confidenceScore = calculateConfidenceScore(sampleCount, totalSeats);

    // 열 패턴 분석 (Phase 2 추가)
    const columnPattern = analyzeColumnPatternForPart(partSeats, maxRows);

    rules.set(part, {
      part,
      side,
      preferredRows,
      overflowRows,
      forbiddenRows,
      rowDistribution,
      sidePercentage,
      frontRowPercentage,
      sampleCount,
      totalSeatsAnalyzed: totalSeats,
      confidenceScore,
      // 열 패턴 데이터
      colRangeByRow: columnPattern.colRangeByRow,
      avgCol: columnPattern.avgCol,
      colConsistency: columnPattern.colConsistency,
    });
  }

  return rules;
}

/**
 * 빈 규칙 생성 (데이터 없을 때 사용)
 */
function createEmptyRule(part: Part): LearnedPartRule {
  return {
    part,
    side: 'both',
    preferredRows: [],
    overflowRows: [],
    forbiddenRows: [],
    rowDistribution: {},
    sidePercentage: 50,
    frontRowPercentage: 0,
    sampleCount: 0,
    totalSeatsAnalyzed: 0,
    confidenceScore: 0,
  };
}

// ============================================================================
// 전체 학습 프로세스
// ============================================================================

/** 학습 입력 데이터 */
export interface LearningInput {
  /** 모든 좌석 데이터 (arrangement_id 포함) */
  seats: SeatDataForLearning[];
  /** 배치별 메타데이터 */
  arrangements: ArrangementMetadata[];
}

/** 학습 출력 데이터 */
export interface LearningOutput {
  /** 학습된 규칙 목록 (DB UPSERT용) */
  rules: LearnedRuleRecord[];
  /** 학습 통계 */
  stats: {
    totalArrangements: number;
    totalSeats: number;
    groupsLearned: number;
    partRulesGenerated: number;
  };
}

/**
 * 전체 과거 데이터에서 파트 배치 규칙 학습
 *
 * 1. 예배 유형별 그룹화
 * 2. 인원수 구간별 그룹화
 * 3. 각 그룹에서 파트별 규칙 학습
 * 4. DB 저장용 레코드 생성
 */
export function learnAllPartPlacementRules(input: LearningInput): LearningOutput {
  const { seats, arrangements } = input;

  // 배치 ID → 메타데이터 맵
  const arrangementMap = new Map<string, ArrangementMetadata>();
  const gridLayouts = new Map<string, GridLayout>();

  for (const arr of arrangements) {
    arrangementMap.set(arr.arrangement_id, arr);
    gridLayouts.set(arr.arrangement_id, arr.grid_layout);
  }

  // 그룹 키: "service_type::member_count_range"
  const groupedSeats = new Map<string, SeatDataForLearning[]>();

  for (const seat of seats) {
    const metadata = arrangementMap.get(seat.arrangement_id);
    if (!metadata) continue;

    const memberCountRange = getMemberCountRange(metadata.total_members);
    const groupKey = `${metadata.service_type}::${memberCountRange}`;

    if (!groupedSeats.has(groupKey)) {
      groupedSeats.set(groupKey, []);
    }
    groupedSeats.get(groupKey)!.push(seat);
  }

  // 각 그룹에서 규칙 학습
  const allRules: LearnedRuleRecord[] = [];
  let partRulesGenerated = 0;

  for (const [groupKey, groupSeats] of groupedSeats.entries()) {
    const [serviceType, memberCountRange] = groupKey.split('::');

    // 해당 그룹의 그리드 레이아웃 Map 필터링
    const groupGridLayouts = new Map<string, GridLayout>();
    for (const seat of groupSeats) {
      if (gridLayouts.has(seat.arrangement_id)) {
        groupGridLayouts.set(seat.arrangement_id, gridLayouts.get(seat.arrangement_id)!);
      }
    }

    // 파트별 규칙 학습
    const partRules = learnPartPlacementRulesFromGroup(groupSeats, groupGridLayouts);

    // DB 레코드로 변환
    for (const [part, rule] of partRules.entries()) {
      // 데이터가 전혀 없는 규칙은 저장하지 않음
      if (rule.totalSeatsAnalyzed === 0) continue;

      allRules.push({
        service_type: serviceType,
        member_count_range: memberCountRange,
        part,
        side: rule.side,
        preferred_rows: rule.preferredRows,
        overflow_rows: rule.overflowRows,
        forbidden_rows: rule.forbiddenRows,
        row_distribution: Object.fromEntries(
          Object.entries(rule.rowDistribution).map(([k, v]) => [k, v])
        ),
        side_percentage: rule.sidePercentage,
        front_row_percentage: rule.frontRowPercentage,
        sample_count: rule.sampleCount,
        total_seats_analyzed: rule.totalSeatsAnalyzed,
        confidence_score: rule.confidenceScore,
        // 열 패턴 데이터 (Phase 2 추가)
        col_range_by_row: rule.colRangeByRow
          ? Object.fromEntries(Object.entries(rule.colRangeByRow).map(([k, v]) => [k, v]))
          : undefined,
        avg_col: rule.avgCol,
        col_consistency: rule.colConsistency,
      });
      partRulesGenerated++;
    }
  }

  return {
    rules: allRules,
    stats: {
      totalArrangements: arrangements.length,
      totalSeats: seats.length,
      groupsLearned: groupedSeats.size,
      partRulesGenerated,
    },
  };
}

// ============================================================================
// 단일 배치 학습 (배치 저장 시 호출)
// ============================================================================

/**
 * 단일 배치에서 해당 그룹의 규칙 업데이트
 *
 * 배치 저장 시 호출하여 점진적 학습 수행
 * - 새로운 배치 데이터를 기존 그룹에 추가
 * - 해당 그룹만 재학습
 */
export function learnFromSingleArrangement(
  newSeats: SeatDataForLearning[],
  metadata: ArrangementMetadata,
  existingGroupSeats: SeatDataForLearning[],
  existingGridLayouts: Map<string, GridLayout>
): Map<Part, LearnedPartRule> {
  // 기존 데이터 + 새 데이터 병합
  const allSeats = [...existingGroupSeats, ...newSeats];

  // 그리드 레이아웃 추가
  const allGridLayouts = new Map(existingGridLayouts);
  allGridLayouts.set(metadata.arrangement_id, metadata.grid_layout);

  // 규칙 학습
  return learnPartPlacementRulesFromGroup(allSeats, allGridLayouts);
}
