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

import rowDistributionPatterns from '@/../training_data/row_distribution_patterns.json';

export interface RowDistributionRecommendation {
  rows: number;
  rowCapacities: number[];
  confidence: 'high' | 'medium' | 'low';
  source: 'learned' | 'interpolated' | 'calculated' | 'cached';
  similarPattern?: {
    totalMembers: number;
    observations: number;
  };
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
 * @returns 추천된 행 구성
 *
 * 최적화: LRU 캐시 적용
 * - 캐시 히트 시 O(1) 조회
 * - 캐시 미스 시 기존 로직 + 캐시 저장
 */
export function recommendRowDistribution(
  totalMembers: number
): RowDistributionRecommendation {
  // 0. 캐시 확인 (최적화)
  const cached = rowPatternCache.get(totalMembers);
  if (cached) {
    return { ...cached, source: 'cached' };
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
    let sum = adjustedCapacities.reduce((a, b) => a + b, 0);
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
  const remainder = totalMembers % 5;

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
  let sum = rowCapacities.reduce((a, b) => a + b, 0);
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
  const remainder = totalMembers % 6;

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
  let sum = rowCapacities.reduce((a, b) => a + b, 0);
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
