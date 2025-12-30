/**
 * 품질 메트릭 계산 모듈
 * 좌석 배치의 품질을 평가하는 메트릭들
 */

import type {
  PlacementRate,
  PartDistributionInfo,
  RowDistributionInfo,
  AnalysisSummary,
  ArrangementAnalysisResponse,
} from '@/types/analysis';
import type { GridLayout } from '@/types/grid';

export interface SeatWithMember {
  memberId: string;
  memberName: string;
  part: string;
  row: number;
  col: number;
  height?: number | null;
  isLeader?: boolean;
}

export interface QualityMetrics {
  placementRate: number;    // 배치율 (0-1)
  partBalance: number;      // 파트 균형도 (0-1)
  heightOrder: number;      // 키 순서 정렬도 (0-1)
  leaderPosition: number;   // 파트장 위치 적절성 (0-1)
}

/**
 * 전체 품질 메트릭 계산
 */
export function calculateQualityMetrics(
  seats: SeatWithMember[],
  totalMembers: number
): QualityMetrics {
  const placementRate = calculatePlacementRate(seats, totalMembers);
  const partBalance = calculatePartBalance(seats);
  const heightOrder = calculateHeightOrder(seats);
  const leaderPosition = calculateLeaderPosition(seats);

  return {
    placementRate,
    partBalance,
    heightOrder,
    leaderPosition,
  };
}

/**
 * 배치율 계산
 * 전체 대원 중 좌석에 배치된 대원의 비율
 */
export function calculatePlacementRate(
  seats: SeatWithMember[],
  totalMembers: number
): number {
  if (totalMembers === 0) return 0;
  return seats.length / totalMembers;
}

/**
 * 파트 균형도 계산
 * 파트별 인원이 얼마나 고르게 분포되어 있는지
 * 분산이 작을수록 균형도가 높음
 */
export function calculatePartBalance(seats: SeatWithMember[]): number {
  if (seats.length === 0) return 0;

  // 파트별 인원 수 계산
  const partCounts: Record<string, number> = {};
  for (const seat of seats) {
    partCounts[seat.part] = (partCounts[seat.part] || 0) + 1;
  }

  const counts = Object.values(partCounts);
  if (counts.length <= 1) return 1; // 파트가 1개 이하면 완벽한 균형

  const avgSize = counts.reduce((a, b) => a + b, 0) / counts.length;
  if (avgSize === 0) return 0;

  const variance = counts.reduce(
    (sum, count) => sum + Math.pow(count - avgSize, 2),
    0
  ) / counts.length;

  // 정규화: 분산이 작을수록 1에 가까움
  return Math.max(0, 1 - (variance / (avgSize * avgSize)));
}

/**
 * 키 순서 정렬도 계산
 * 같은 행에서 키가 얼마나 정렬되어 있는지 평가
 *
 * 찬양대 배치 규칙:
 * - 같은 행에서 양쪽 끝에서 중앙으로 갈수록 키가 커지는 것이 이상적
 * - 또는 한쪽에서 다른 쪽으로 일관된 방향으로 정렬
 */
export function calculateHeightOrder(seats: SeatWithMember[]): number {
  // 키 정보가 있는 좌석만 필터링
  const seatsWithHeight = seats.filter(
    (s) => s.height !== null && s.height !== undefined
  );

  if (seatsWithHeight.length < 2) return 1; // 비교할 좌석이 부족하면 만점

  // 행별로 그룹화
  const rowGroups: Map<number, SeatWithMember[]> = new Map();
  for (const seat of seatsWithHeight) {
    const row = seat.row;
    if (!rowGroups.has(row)) {
      rowGroups.set(row, []);
    }
    rowGroups.get(row)!.push(seat);
  }

  let totalScore = 0;
  let validRows = 0;

  for (const [, rowSeats] of rowGroups) {
    if (rowSeats.length < 2) continue;

    // 열 기준으로 정렬
    const sortedByCol = [...rowSeats].sort((a, b) => a.col - b.col);
    const heights = sortedByCol.map((s) => s.height!);

    // 정렬 점수 계산 (오름차순 또는 내림차순)
    const ascScore = calculateSortedness(heights, 'asc');
    const descScore = calculateSortedness(heights, 'desc');

    // 양방향 정렬 점수 (중앙에서 양쪽으로 키가 작아지는 패턴)
    const centerScore = calculateCenterOutwardSortedness(heights);

    // 가장 높은 점수 사용
    const rowScore = Math.max(ascScore, descScore, centerScore);
    totalScore += rowScore;
    validRows++;
  }

  return validRows > 0 ? totalScore / validRows : 1;
}

/**
 * 정렬 정도 계산 (오름차순 또는 내림차순)
 */
function calculateSortedness(
  values: number[],
  direction: 'asc' | 'desc'
): number {
  if (values.length < 2) return 1;

  let correctPairs = 0;
  const totalPairs = values.length - 1;

  for (let i = 0; i < values.length - 1; i++) {
    const isCorrect =
      direction === 'asc'
        ? values[i] <= values[i + 1]
        : values[i] >= values[i + 1];
    if (isCorrect) correctPairs++;
  }

  return correctPairs / totalPairs;
}

/**
 * 중앙에서 바깥으로 키가 작아지는 패턴 점수
 * (양쪽 끝이 작고 중앙이 큰 패턴)
 */
function calculateCenterOutwardSortedness(heights: number[]): number {
  if (heights.length < 3) return 0.5; // 3개 미만이면 패턴 판단 불가

  const center = Math.floor(heights.length / 2);
  let correctPairs = 0;
  let totalPairs = 0;

  // 중앙에서 왼쪽으로: 키가 작아져야 함
  for (let i = center; i > 0; i--) {
    if (heights[i - 1] <= heights[i]) correctPairs++;
    totalPairs++;
  }

  // 중앙에서 오른쪽으로: 키가 작아져야 함
  for (let i = center; i < heights.length - 1; i++) {
    if (heights[i + 1] <= heights[i]) correctPairs++;
    totalPairs++;
  }

  return totalPairs > 0 ? correctPairs / totalPairs : 0.5;
}

/**
 * 파트장 위치 적절성 계산
 * 파트장이 해당 파트 그룹의 중심에 가까울수록 높은 점수
 */
export function calculateLeaderPosition(seats: SeatWithMember[]): number {
  // 파트장 좌석 필터링
  const leaderSeats = seats.filter((s) => s.isLeader);
  if (leaderSeats.length === 0) return 1; // 파트장이 없으면 만점

  let totalScore = 0;

  for (const leader of leaderSeats) {
    // 같은 파트의 좌석들 찾기
    const samePartSeats = seats.filter(
      (s) => s.part === leader.part && s.row === leader.row
    );

    if (samePartSeats.length <= 1) {
      totalScore += 1; // 파트원이 혼자면 만점
      continue;
    }

    // 파트의 중심 열 계산
    const cols = samePartSeats.map((s) => s.col);
    const centerCol = (Math.min(...cols) + Math.max(...cols)) / 2;

    // 파트장이 중심에서 얼마나 떨어져 있는지
    const maxDistance = (Math.max(...cols) - Math.min(...cols)) / 2;
    if (maxDistance === 0) {
      totalScore += 1;
      continue;
    }

    const distance = Math.abs(leader.col - centerCol);
    const score = Math.max(0, 1 - distance / maxDistance);
    totalScore += score;
  }

  return totalScore / leaderSeats.length;
}

/**
 * 전체 품질 점수 계산 (가중 평균)
 */
export function calculateOverallQualityScore(metrics: QualityMetrics): number {
  return (
    metrics.placementRate * 0.4 +
    metrics.partBalance * 0.25 +
    metrics.heightOrder * 0.2 +
    metrics.leaderPosition * 0.15
  );
}

// =============================================================================
// 배치 분석 함수들
// =============================================================================

/**
 * 배치율 상세 계산
 */
export function calculatePlacementRateDetail(
  seats: SeatWithMember[],
  availableMembers: number
): PlacementRate {
  const placed = seats.length;
  const percentage = availableMembers > 0
    ? Math.round((placed / availableMembers) * 100)
    : 0;

  return {
    placed,
    available: availableMembers,
    percentage,
  };
}

/**
 * 파트별 분포 분석
 */
export function calculatePartDistributionDetail(
  seats: SeatWithMember[]
): Record<string, PartDistributionInfo> {
  const partMap: Record<string, PartDistributionInfo> = {};

  for (const seat of seats) {
    if (!partMap[seat.part]) {
      partMap[seat.part] = {
        count: 0,
        columns: [],
        rows: [],
        columnRange: null,
      };
    }

    const info = partMap[seat.part];
    info.count++;

    if (!info.columns.includes(seat.col)) {
      info.columns.push(seat.col);
    }
    if (!info.rows.includes(seat.row)) {
      info.rows.push(seat.row);
    }
  }

  // 각 파트의 열 범위 계산
  for (const part of Object.keys(partMap)) {
    const info = partMap[part];
    info.columns.sort((a, b) => a - b);
    info.rows.sort((a, b) => a - b);

    if (info.columns.length > 0) {
      info.columnRange = {
        min: info.columns[0],
        max: info.columns[info.columns.length - 1],
      };
    }
  }

  return partMap;
}

/**
 * 행별 분포 분석
 */
export function calculateRowDistributionDetail(
  seats: SeatWithMember[],
  gridLayout: GridLayout
): RowDistributionInfo[] {
  const rowMap: Map<number, RowDistributionInfo> = new Map();

  // 모든 행 초기화
  for (let row = 0; row < gridLayout.rows; row++) {
    rowMap.set(row, {
      row,
      totalSeats: gridLayout.rowCapacities[row] || 0,
      occupied: 0,
      partBreakdown: {},
    });
  }

  // 좌석 데이터 집계
  for (const seat of seats) {
    const info = rowMap.get(seat.row);
    if (info) {
      info.occupied++;
      info.partBreakdown[seat.part] = (info.partBreakdown[seat.part] || 0) + 1;
    }
  }

  return Array.from(rowMap.values()).sort((a, b) => a.row - b.row);
}

/**
 * 분석 요약 생성
 */
export function generateAnalysisSummary(
  placementRate: PlacementRate,
  rowDistribution: RowDistributionInfo[]
): AnalysisSummary {
  // 배치율 기반 점수 (0-100)
  const placementScore = placementRate.percentage;

  // 행별 균형도 점수 계산
  const occupancyRates = rowDistribution
    .filter(r => r.totalSeats > 0)
    .map(r => r.occupied / r.totalSeats);

  let balanceScore = 100;
  if (occupancyRates.length > 1) {
    const avgRate = occupancyRates.reduce((a, b) => a + b, 0) / occupancyRates.length;
    const variance = occupancyRates.reduce(
      (sum, rate) => sum + Math.pow(rate - avgRate, 2),
      0
    ) / occupancyRates.length;
    // 분산이 작을수록 균형도가 높음
    balanceScore = Math.max(0, Math.round((1 - Math.sqrt(variance)) * 100));
  }

  // 종합 점수 (배치율 70%, 균형도 30%)
  const overallScore = Math.round(placementScore * 0.7 + balanceScore * 0.3);

  // 메시지 생성
  let message: string;
  if (overallScore >= 90) {
    message = '훌륭한 배치입니다!';
  } else if (overallScore >= 70) {
    message = '좋은 배치입니다.';
  } else if (overallScore >= 50) {
    message = '적절한 배치입니다.';
  } else {
    message = '배치를 더 추가해보세요.';
  }

  return {
    overallScore,
    message,
  };
}

/**
 * 전체 배치 분석 실행
 */
export function analyzeArrangement(
  seats: SeatWithMember[],
  availableMembers: number,
  gridLayout: GridLayout
): ArrangementAnalysisResponse {
  const placementRate = calculatePlacementRateDetail(seats, availableMembers);
  const partDistribution = calculatePartDistributionDetail(seats);
  const rowDistribution = calculateRowDistributionDetail(seats, gridLayout);
  const summary = generateAnalysisSummary(placementRate, rowDistribution);

  return {
    placementRate,
    partDistribution,
    rowDistribution,
    summary,
  };
}
