/**
 * 행별 인원 분배 추천 시스템
 * 40개 배치 패턴(3,139석) 학습 데이터 기반
 *
 * 주의: 패턴 배열은 UI 순서(1줄부터)로 저장됨
 * - 배열 index 0 = UI 1줄 (맨 앞줄)
 * - 배열 index n-1 = UI n줄 (맨 뒷줄)
 *
 * 학습된 패턴: 앞줄(작음) → 뒤줄(큼)
 * 예: 84명 → [15, 15, 15, 15, 13, 11] (1줄 15명, 6줄 11명)
 *
 * 최적화 적용:
 * - LRU Cache: 최근 계산된 패턴 캐싱 (45-95명 범위, ~50개)
 */
import rowDistributionPatterns from '@/data/row_distribution_patterns.json';

export interface RowDistributionRecommendation {
  rows: number;
  rowCapacities: number[];
  confidence: 'high' | 'medium' | 'low';
  source: 'learned' | 'interpolated' | 'calculated' | 'cached' | 'adjusted';
  similarPattern?: {
    totalMembers: number;
    observations: number;
  };
  /** ALTO 제약으로 인한 조정 정보 */
  adjustments?: {
    reason: 'alto_constraint';
    altoDeficit: number;
    addedToFrontRows: number;
  };
}

/**
 * 파트별 인원 수 (ALTO 좌석 보장 계산용)
 */
export interface PartCounts {
  SOPRANO?: number;
  ALTO?: number;
  TENOR?: number;
  BASS?: number;
  SPECIAL?: number;
}

/**
 * 학습된 패턴 데이터 타입
 */
interface LearnedPattern {
  rows: number;
  capacities: number[];
  observations: number;
}

const LEARNED_PATTERNS = rowDistributionPatterns as Record<string, LearnedPattern>;

/**
 * Simple LRU Cache for row distribution patterns
 * 최근 50개 패턴 캐싱 (45-95명 범위 커버)
 */
class RowPatternCache {
  private cache: Map<number, RowDistributionRecommendation> = new Map();
  private readonly maxSize = 50;

  get(totalMembers: number): RowDistributionRecommendation | undefined {
    const result = this.cache.get(totalMembers);
    if (result) {
      // LRU: 접근 시 맨 뒤로 이동
      this.cache.delete(totalMembers);
      this.cache.set(totalMembers, result);
    }
    return result;
  }

  set(totalMembers: number, result: RowDistributionRecommendation): void {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      // 가장 오래된 항목 제거 (Map은 삽입 순서 유지)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(totalMembers, result);
  }

  // 캐시 통계 (디버깅용)
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

const rowPatternCache = new RowPatternCache();

/**
 * 총 인원에 대한 최적의 행별 인원 분배 추천
 * @param totalMembers 총 인원 수
 * @param partCounts 파트별 인원 (선택) - ALTO 제약 반영을 위해 전달
 * @returns 추천된 행 구성
 *
 * 최적화: LRU 캐시 적용
 * - 캐시 히트 시 O(1) 조회
 * - 캐시 미스 시 기존 로직 + 캐시 저장
 *
 * ALTO 미배치 방지:
 * - partCounts.ALTO가 전달되면 1-4행에 충분한 좌석 보장
 * - 부족 시 5-6행에서 1-4행으로 좌석 재분배
 */
export function recommendRowDistribution(
  totalMembers: number,
  partCounts?: PartCounts
): RowDistributionRecommendation {
  // 0. 캐시 확인 (최적화)
  // partCounts가 있으면 캐시된 결과에도 ALTO 조정 필요
  const cached = rowPatternCache.get(totalMembers);
  if (cached) {
    const cachedResult = { ...cached, source: 'cached' as const };

    // ALTO 조정 필요한 경우
    if (partCounts?.ALTO) {
      const adjusted = adjustRecommendationForPartConstraints(cachedResult, partCounts);
      if (adjusted) return adjusted;
    }

    return cachedResult;
  }

  // 1. 정확히 일치하는 학습 패턴이 있는 경우
  const exactPattern = LEARNED_PATTERNS[totalMembers.toString()];
  if (exactPattern) {
    const result: RowDistributionRecommendation = {
      rows: exactPattern.rows,
      rowCapacities: exactPattern.capacities,
      confidence: 'high',
      source: 'learned',
      similarPattern: {
        totalMembers,
        observations: exactPattern.observations,
      },
    };
    rowPatternCache.set(totalMembers, result);

    // ALTO 조정 필요한 경우
    if (partCounts?.ALTO) {
      const adjusted = adjustRecommendationForPartConstraints(result, partCounts);
      if (adjusted) return adjusted;
    }

    return result;
  }

  // 2. 가장 가까운 학습 패턴 찾기
  const learnedTotals = Object.keys(LEARNED_PATTERNS)
    .map(Number)
    .sort((a, b) => Math.abs(a - totalMembers) - Math.abs(b - totalMembers));

  const closestTotal = learnedTotals[0];
  const closestPattern = LEARNED_PATTERNS[closestTotal.toString()];

  // 3. 차이가 5명 이하면 보간법 사용
  const diff = Math.abs(totalMembers - closestTotal);
  if (diff <= 5) {
    // 비율을 유지하면서 조정
    const scaleFactor = totalMembers / closestTotal;
    const adjustedCapacities = closestPattern.capacities.map((capacity) =>
      Math.round(capacity * scaleFactor)
    );

    // 합계 맞추기
    const sum = adjustedCapacities.reduce((a, b) => a + b, 0);
    let remainder = totalMembers - sum;

    // 나머지를 앞쪽 행부터 분배 (학습 패턴에 따라 앞쪽이 더 많음)
    let attempts = 0;
    while (remainder !== 0 && attempts < 100) {
      for (let i = 0; i < adjustedCapacities.length && remainder !== 0; i++) {
        if (remainder > 0) {
          adjustedCapacities[i]++;
          remainder--;
        } else if (remainder < 0) {
          adjustedCapacities[i]--;
          remainder++;
        }
      }
      attempts++;
    }

    const interpolatedResult: RowDistributionRecommendation = {
      rows: closestPattern.rows,
      rowCapacities: adjustedCapacities,
      confidence: 'medium',
      source: 'interpolated',
      similarPattern: {
        totalMembers: closestTotal,
        observations: closestPattern.observations,
      },
    };
    rowPatternCache.set(totalMembers, interpolatedResult);

    // ALTO 조정 필요한 경우
    if (partCounts?.ALTO) {
      const adjusted = adjustRecommendationForPartConstraints(interpolatedResult, partCounts);
      if (adjusted) return adjusted;
    }

    return interpolatedResult;
  }

  // 4. 학습 패턴 기반 계산 (55명 기준)
  const numRows = totalMembers <= 55 ? 5 : 6;

  let calculatedResult: RowDistributionRecommendation;
  if (numRows === 5) {
    // 5행 패턴: 앞쪽이 적고 중간~뒤쪽이 많음
    calculatedResult = calculate5RowDistribution(totalMembers, closestTotal, closestPattern);
  } else {
    // 6행 패턴: 앞쪽이 적고 뒤쪽으로 갈수록 많아짐
    calculatedResult = calculate6RowDistribution(totalMembers, closestTotal, closestPattern);
  }

  // 계산 결과도 캐시에 저장
  rowPatternCache.set(totalMembers, calculatedResult);

  // ALTO 조정 필요한 경우
  if (partCounts?.ALTO) {
    const adjusted = adjustRecommendationForPartConstraints(calculatedResult, partCounts);
    if (adjusted) return adjusted;
  }

  return calculatedResult;
}

/**
 * 5행 분배 계산 (학습 패턴 기반)
 */
function calculate5RowDistribution(
  totalMembers: number,
  closestTotal: number,
  closestPattern: LearnedPattern
): RowDistributionRecommendation {
  const basePerRow = Math.floor(totalMembers / 5);

  // 학습된 패턴 (UI 순서): [많음, 중간, 작음, 작음, 매우 작음]
  // 역순 패턴: 45명 [9,9,10,9,8], 52명 [10,11,10,11,10], 53명 [11,12,11,10,9]
  const rowCapacities = [
    basePerRow + 1, // 0행 (1줄): 많음
    basePerRow, // 1행 (2줄)
    basePerRow + 1, // 2행 (3줄)
    basePerRow, // 3행 (4줄)
    basePerRow - 1, // 4행 (5줄): 가장 작음
  ];

  // 합계 맞추기
  const sum = rowCapacities.reduce((a, b) => a + b, 0);
  let diff = totalMembers - sum;

  // 나머지를 앞쪽 행 중심으로 분배
  const priorityRows = [0, 2, 1, 3, 4];
  for (const row of priorityRows) {
    if (diff === 0) break;
    if (diff > 0) {
      rowCapacities[row]++;
      diff--;
    } else {
      rowCapacities[row]--;
      diff++;
    }
  }

  return {
    rows: 5,
    rowCapacities,
    confidence: 'medium',
    source: 'calculated',
    similarPattern: {
      totalMembers: closestTotal,
      observations: closestPattern.observations,
    },
  };
}

/**
 * 6행 분배 계산 (학습 패턴 기반)
 */
function calculate6RowDistribution(
  totalMembers: number,
  closestTotal: number,
  closestPattern: LearnedPattern
): RowDistributionRecommendation {
  const basePerRow = Math.floor(totalMembers / 6);
  const _remainder = totalMembers % 6; // 추후 정밀한 분배 계산에 사용 가능

  // 학습된 패턴 (UI 순서): 앞쪽 행이 많고 뒤쪽으로 갈수록 적어짐
  // 역순 패턴: 84명 [15,15,15,15,13,11], 88명 평균 [15,16,17,16,13,11]
  const rowCapacities = [
    basePerRow + 2, // 0행 (1줄): 가장 많음
    basePerRow + 1, // 1행 (2줄)
    basePerRow + 1, // 2행 (3줄)
    basePerRow + 1, // 3행 (4줄)
    basePerRow - 1, // 4행 (5줄)
    basePerRow - 2, // 5행 (6줄): 가장 적음
  ];

  // 합계 맞추기
  const sum = rowCapacities.reduce((a, b) => a + b, 0);
  let diff = totalMembers - sum;

  // 나머지를 앞쪽 행 중심으로 분배
  const priorityRows = [0, 1, 2, 3, 4, 5];
  for (const row of priorityRows) {
    if (diff === 0) break;
    if (diff > 0) {
      rowCapacities[row]++;
      diff--;
    } else {
      if (rowCapacities[row] > basePerRow - 2) {
        // 너무 작아지지 않도록
        rowCapacities[row]--;
        diff++;
      }
    }
  }

  return {
    rows: 6,
    rowCapacities,
    confidence: 'medium',
    source: 'calculated',
    similarPattern: {
      totalMembers: closestTotal,
      observations: closestPattern.observations,
    },
  };
}

/**
 * 모든 학습된 패턴 목록 반환
 */
export function getAllLearnedPatterns(): Array<{
  totalMembers: number;
  rows: number;
  capacities: number[];
  observations: number;
}> {
  return Object.entries(LEARNED_PATTERNS).map(([total, pattern]) => ({
    totalMembers: Number(total),
    rows: pattern.rows,
    capacities: pattern.capacities,
    observations: pattern.observations,
  }));
}

/**
 * 특정 인원 범위의 학습된 패턴 반환
 */
export function getLearnedPatternsInRange(
  minMembers: number,
  maxMembers: number
): Array<{
  totalMembers: number;
  rows: number;
  capacities: number[];
  observations: number;
}> {
  return getAllLearnedPatterns().filter(
    (p) => p.totalMembers >= minMembers && p.totalMembers <= maxMembers
  );
}

// ============================================================
// ALTO 미배치 방지: 1-4행 좌석 보장 로직
// ============================================================

/** 행당 최대 좌석 수 */
const MAX_CAPACITY_PER_ROW = 16;

/**
 * 1-4행 ALTO 영역 좌석 수 계산
 * 실제 배치 로직과 일치하도록 수정:
 * - 1-3행: sopranoRatio 기반 동적 분배
 * - 4행: overflow 최대 6석
 *
 * @param rowCapacities 행별 좌석 수
 * @param partCounts 파트별 인원 (SOPRANO/ALTO 비율 계산용)
 */
function calculateAltoCapacity(rowCapacities: number[], partCounts?: PartCounts): number {
  const sopranoCount = partCounts?.SOPRANO || 0;
  const altoCount = partCounts?.ALTO || 0;
  const totalSA = sopranoCount + altoCount;

  // sopranoRatio 계산 (기본값 0.5 = 50% 가정)
  const sopranoRatio = totalSA > 0 ? sopranoCount / totalSA : 0.5;

  let capacity = 0;

  // 1-3행: 동적 비율 기반 (ALTO = 전체 - SOPRANO 비율)
  for (let row = 0; row < Math.min(3, rowCapacities.length); row++) {
    const rowCap = rowCapacities[row];
    const altoCapForRow = rowCap - Math.round(rowCap * sopranoRatio);
    capacity += altoCapForRow;
  }

  // 4행: overflow 동적 확장 가능 (ALTO 부족 시 전체 가용 공간 사용)
  // 기본 6석이지만, ALTO 인원이 많으면 확장됨
  if (rowCapacities.length >= 4) {
    // 4행 전체 용량을 ALTO 가용 공간으로 계산
    // (실제 배치 시 다른 파트와 경쟁하지만, 최대 가능 용량 기준)
    capacity += rowCapacities[3];
  }

  return capacity;
}

/**
 * ALTO 부족분 계산
 * @param rowCapacities 행별 좌석 수
 * @param altoCount ALTO 인원 수
 * @param partCounts 파트별 인원 (용량 계산용)
 * @returns 양수면 부족, 0이면 충분
 */
function calculateAltoDeficit(
  rowCapacities: number[],
  altoCount: number,
  partCounts?: PartCounts
): number {
  const current = calculateAltoCapacity(rowCapacities, partCounts);
  return Math.max(0, altoCount - current);
}

/**
 * ALTO 제약을 반영하여 1-4행 좌석 추가
 * 부족분만큼 1-4행에 좌석을 균등하게 추가
 *
 * @param baseCapacities 기본 행별 좌석 수
 * @param altoCount ALTO 인원 수
 * @param partCounts 파트별 인원 (용량 계산용)
 */
function adjustForAltoConstraint(
  baseCapacities: number[],
  altoCount: number,
  partCounts?: PartCounts
): { adjusted: number[]; deficit: number; added: number } {
  const adjusted = [...baseCapacities];
  let deficit = calculateAltoDeficit(adjusted, altoCount, partCounts);
  const originalDeficit = deficit;

  if (deficit <= 0) {
    return { adjusted, deficit: 0, added: 0 };
  }

  // 1-4행에 좌석 추가 (균등 분배)
  const frontRows = [0, 1, 2, 3].filter((r) => r < adjusted.length);

  while (deficit > 0) {
    // 가장 적은 행부터 추가
    frontRows.sort((a, b) => adjusted[a] - adjusted[b]);

    let addedThisRound = false;
    for (const rowIdx of frontRows) {
      if (deficit <= 0) break;
      if (adjusted[rowIdx] < MAX_CAPACITY_PER_ROW) {
        adjusted[rowIdx]++;
        deficit--;
        addedThisRound = true;
      }
    }

    // 무한 루프 방지: 더 이상 추가할 수 없으면 중단
    if (!addedThisRound) break;
  }

  return {
    adjusted,
    deficit: originalDeficit,
    added: originalDeficit - deficit,
  };
}

/**
 * 5-6행에서 좌석 감소 (총 좌석 수 균형)
 * 1-4행에 좌석을 추가한 만큼 5-6행에서 감소
 */
function rebalanceBackRows(capacities: number[], originalTotal: number): number[] {
  const adjusted = [...capacities];
  let excess = adjusted.reduce((a, b) => a + b, 0) - originalTotal;

  if (excess <= 0) return adjusted;

  // 5-6행(인덱스 4, 5)에서 감소 - 뒤에서부터
  const backRows = [5, 4].filter((r) => r < adjusted.length);

  for (const rowIdx of backRows) {
    while (excess > 0 && adjusted[rowIdx] > 1) {
      adjusted[rowIdx]--;
      excess--;
    }
  }

  return adjusted;
}

/**
 * 파트별 제약을 반영한 그리드 조정
 * @param base 기본 추천 결과
 * @param partCounts 파트별 인원
 * @returns 조정된 추천 결과 (또는 조정 불필요 시 null)
 */
export function adjustRecommendationForPartConstraints(
  base: RowDistributionRecommendation,
  partCounts: PartCounts
): RowDistributionRecommendation | null {
  const altoCount = partCounts.ALTO || 0;

  if (altoCount === 0) return null;

  // ALTO 부족분 확인 (partCounts 전달하여 실제 비율 기반 계산)
  const deficit = calculateAltoDeficit(base.rowCapacities, altoCount, partCounts);
  if (deficit <= 0) return null;

  const totalMembers = base.rowCapacities.reduce((a, b) => a + b, 0);

  // 1-4행 좌석 추가 (partCounts 전달)
  const { adjusted, added } = adjustForAltoConstraint(base.rowCapacities, altoCount, partCounts);

  // 5-6행 좌석 감소 (균형)
  const rebalanced = rebalanceBackRows(adjusted, totalMembers);

  return {
    ...base,
    rowCapacities: rebalanced,
    source: 'adjusted',
    adjustments: {
      reason: 'alto_constraint',
      altoDeficit: deficit,
      addedToFrontRows: added,
    },
  };
}
