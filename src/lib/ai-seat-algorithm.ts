/**
 * AI 기반 찬양대 자리배치 알고리즘
 *
 * 3,577개의 2부예배 학습 데이터를 기반으로 한 규칙 기반 배치 알고리즘
 * (학습 기간: 2025-01-05 ~ 2025-11-09, 43회 예배 데이터)
 *
 * 배치 원칙:
 * - 행(Row): SOPRANO/ALTO는 앞쪽(1-3행), TENOR/BASS는 뒤쪽(4-6행)
 * - 열(Col): 각 행 내에서 왼쪽부터 SOPRANO → ALTO → TENOR → BASS 순서
 * - 파트끼리 모여 앉음: 같은 파트는 연속으로 배치
 * - 고정석: 대원별 이전 배치 이력 기반 선호 좌석 우선 배치 (61.2% 대원이 고정석 성향)
 */

import { recommendRowDistribution } from './row-distribution-recommender';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'AI-Seat' });

export interface Member {
  id: string;
  name: string;
  part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS';
}

/**
 * 대원별 이전 배치 이력
 * - 고정석 패턴 계산에 사용
 */
export interface SeatHistory {
  member_id: string;
  positions: Array<{
    row: number;
    col: number;
    date?: string;
  }>;
}

/**
 * 대원별 선호 좌석 정보
 * - 이전 배치 이력 기반 계산
 */
export interface PreferredSeat {
  member_id: string;
  preferred_row: number;        // 가장 많이 앉은 행
  preferred_col: number;        // 평균 열 위치
  row_consistency: number;      // 행 일관성 (0-1)
  col_consistency: number;      // 열 일관성 (0-1)
  total_appearances: number;    // 총 출석 횟수
}

export interface Seat {
  member_id: string;
  member_name: string;
  part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS';
  row: number;  // 1-based (1 = 맨 앞줄)
  col: number;  // 1-based (1 = 맨 왼쪽)
}

export interface GridLayout {
  rows: number;
  row_capacities: number[];  // 1줄부터 n줄까지 순서
  zigzag_pattern: 'even' | 'odd';
}

export interface ArrangementResult {
  grid_layout: GridLayout;
  seats: Seat[];
  metadata: {
    total_members: number;
    breakdown: Record<string, number>;
  };
}

/**
 * 학습 데이터 기반 파트별 배치 규칙
 *
 * 지휘자 중심 좌우 분할:
 * - 왼쪽: SOPRANO (1~3행 주 배치, overflow 시 4~6행 가장자리)
 *        TENOR (4~6행 중앙부터)
 * - 오른쪽: ALTO (1~3행 주 배치, overflow 시 4행까지만, 5~6행 금지)
 *          BASS (4~6행 중앙부터)
 *
 * ML 데이터 분석 결과 (2부예배 43회, 3,577석):
 * - SOPRANO: 92.0% 왼쪽 (78.0% 앞줄 1-3행)
 * - ALTO: 99.8% 오른쪽 (86.6% 앞줄 1-3행)
 * - TENOR: 97.7% 왼쪽 (99.5% 뒷줄 4-6행)
 * - BASS: 97.8% 오른쪽 (99.5% 뒷줄 4-6행)
 *
 * 중요: 알토는 4행까지만 overflow 가능 (5~6행 배치 금지)
 */
const PART_PLACEMENT_RULES = {
  SOPRANO: { side: 'left', preferredRows: [1, 2, 3], overflowRows: [4, 5, 6], sidePercentage: 92.0, frontRowPercentage: 78.0 },
  ALTO: { side: 'right', preferredRows: [1, 2, 3], overflowRows: [4], sidePercentage: 99.8, frontRowPercentage: 86.6 }, // 5, 6행 제외!
  TENOR: { side: 'left', preferredRows: [4, 5, 6], overflowRows: [], sidePercentage: 97.7, frontRowPercentage: 0.5 },
  BASS: { side: 'right', preferredRows: [4, 5, 6], overflowRows: [], sidePercentage: 97.8, frontRowPercentage: 0.5 },
} as const;

/**
 * 고정석 패턴 임계값
 * - MIN_APPEARANCES: 선호 좌석 계산에 필요한 최소 출석 횟수
 * - HIGH_CONSISTENCY: 고정석으로 간주하는 일관성 임계값
 */
const FIXED_SEAT_CONFIG = {
  MIN_APPEARANCES: 3,           // 최소 3회 이상 출석해야 선호 좌석 계산
  HIGH_CONSISTENCY: 0.8,        // 80% 이상이면 고정석으로 간주
  COL_TOLERANCE: 2,             // 열 일관성 계산 시 ±2열 허용
} as const;

/**
 * 파트별 열 범위 제약 (과거배치 로직에서 가져옴)
 * - 각 행에서 파트가 배치될 수 있는 열 범위 정의
 * - 기본 16열 기준, 그리드 크기에 따라 비례 조정
 */
const BASE_GRID_COLS = 15;

/**
 * 학습된 열 범위 상수 (DEFAULT_COL_RANGES와 동기화)
 *
 * 변경 이력:
 * - 2026-01-14(v5): avg 값 추가하여 중앙 우선 배치 지원
 * - 2026-01-14(v4): 전체 OCR 오류 수정 후 최종 재학습 데이터 반영
 */
const PART_COL_CONSTRAINTS: Record<string, Record<number, { min: number; max: number; avg: number }>> = {
  SOPRANO: {
    1: { min: 1, max: 9, avg: 4.51 },
    2: { min: 1, max: 9, avg: 4.74 },
    3: { min: 1, max: 10, avg: 5.08 },
    4: { min: 1, max: 5, avg: 2.38 },   // 오버플로우, 좌측 집중
    5: { min: 1, max: 4, avg: 1.88 },   // 오버플로우, 좌측 집중
    6: { min: 1, max: 2, avg: 1.5 },    // 오버플로우, 극좌측만
  },
  ALTO: {
    1: { min: 7, max: 16, avg: 11.8 },
    2: { min: 8, max: 16, avg: 12.21 },
    3: { min: 8, max: 17, avg: 12.67 },
    4: { min: 11, max: 16, avg: 13.7 }, // 오버플로우
    // 5, 6행은 ALTO 금지
  },
  TENOR: {
    // 1-3행은 TENOR 금지
    4: { min: 3, max: 8, avg: 5.96 },
    5: { min: 1, max: 7, avg: 5.04 },
    6: { min: 1, max: 7, avg: 3.59 },
  },
  BASS: {
    // 1-3행은 BASS 금지
    4: { min: 6, max: 14, avg: 10.19 },
    5: { min: 6, max: 14, avg: 10.07 },
    6: { min: 6, max: 12, avg: 8.91 },
  },
};

/**
 * 그리드 크기에 따라 열 범위 조정 (avg 포함)
 */
function getAdjustedColConstraints(
  part: string,
  row: number,
  rowCapacity: number
): { min: number; max: number; avg: number } | null {
  const constraint = PART_COL_CONSTRAINTS[part]?.[row];
  if (!constraint) return null;

  // 기본 15열 기준 비율로 조정
  const ratio = rowCapacity / BASE_GRID_COLS;
  return {
    min: Math.max(1, Math.round(constraint.min * ratio)),
    max: Math.min(rowCapacity, Math.round(constraint.max * ratio)),
    avg: Math.round(constraint.avg * ratio * 100) / 100,  // 소수점 2자리
  };
}

/**
 * Row 4-6에서 다른 파트의 "전용 영역"에 해당하는지 확인
 *
 * 4-6행 영역 구분:
 * - SOPRANO overflow: 왼쪽 끝 (col <= SOPRANO.max, 보통 col 1~5)
 * - TENOR: 중앙-왼쪽 (SOPRANO.max 초과 ~ BASS.min 미만)
 * - BASS: 오른쪽 (col >= BASS.min, 보통 col 6+)
 * - ALTO overflow: 4행만 허용, 오른쪽 끝 (col >= ALTO.min)
 *
 * @returns true면 다른 파트 영역 침범 (배치 금지)
 */
function isInOtherPartTerritory(
  row: number,
  col: number,
  currentPart: string,
  rowCapacity: number
): boolean {
  // Row 1-3에서 SOPRANO/ALTO 간 영역 체크 (TENOR/BASS는 row 1-3 자체가 금지)
  if (row < 4) {
    if (currentPart === 'SOPRANO') {
      // SOPRANO가 ALTO 영역(오른쪽)에 들어가면 안 됨
      const altoCol = getAdjustedColConstraints('ALTO', row, rowCapacity);
      if (altoCol && col >= altoCol.min) {
        return true; // ALTO 영역 침범
      }
    } else if (currentPart === 'ALTO') {
      // ALTO가 SOPRANO 영역(왼쪽)에 들어가면 안 됨
      const sopranoCol = getAdjustedColConstraints('SOPRANO', row, rowCapacity);
      if (sopranoCol && col <= sopranoCol.max) {
        return true; // SOPRANO 영역 침범
      }
    }
    // TENOR/BASS는 row 1-3 자체가 금지
    if (currentPart === 'TENOR' || currentPart === 'BASS') {
      return true; // TENOR/BASS의 row 1-3 배치 금지
    }
    return false;
  }

  // 각 파트의 열 범위 가져오기
  const sopranoCol = getAdjustedColConstraints('SOPRANO', row, rowCapacity);
  const bassCol = getAdjustedColConstraints('BASS', row, rowCapacity);

  // SOPRANO overflow 전용 영역: col 1 ~ SOPRANO.max
  const sopranoMaxCol = sopranoCol?.max ?? 0;
  // BASS 전용 영역 시작: BASS.min ~
  const bassMinCol = bassCol?.min ?? rowCapacity + 1;

  switch (currentPart) {
    case 'BASS':
      // BASS는 SOPRANO overflow 영역(왼쪽 끝)에 들어가면 안 됨
      if (sopranoMaxCol > 0 && col <= sopranoMaxCol) {
        return true; // SOPRANO overflow 영역 침범
      }
      break;

    case 'TENOR':
      // SOPRANO overflow 영역 침범 금지 (col 1-5)
      if (sopranoMaxCol > 0 && col <= sopranoMaxCol) {
        return true; // SOPRANO overflow 영역 침범
      }
      // BASS 전용 영역(오른쪽) 침범 금지
      if (col >= bassMinCol) {
        return true; // BASS 영역 침범
      }
      break;

    case 'SOPRANO':
      // SOPRANO overflow는 왼쪽 가장자리에만 배치 (중앙 침범 금지)
      // 학습 범위: row 4 col 1-5, row 5 col 1-4, row 6 col 1-2
      // 중앙 기준: midCol 이상은 TENOR/BASS 영역
      const midColForSoprano = Math.ceil(rowCapacity / 2);
      // 학습 범위와 중앙 기준 중 더 작은 값 사용
      const sopranoOverflowMax = Math.min(sopranoMaxCol || 5, midColForSoprano - 1);

      if (col > sopranoOverflowMax) {
        return true; // TENOR/BASS 영역 침범
      }
      break;

    case 'ALTO':
      // ALTO는 Row 5-6 자체가 금지 (overflowRows에 없음)
      // Row 4에서는 ALTO 열 범위(col 11-16) 미만이면 모두 금지
      if (row === 4) {
        // ALTO 열 범위 미만이면 모두 금지 (다른 파트 영역)
        // ALTO 4행 min=11이므로 col 1-10은 모두 금지
        const altoCol = getAdjustedColConstraints('ALTO', row, rowCapacity);
        if (altoCol && col < altoCol.min) {
          return true; // ALTO 열 범위 미만 = SOPRANO/TENOR/BASS 영역
        }
      }
      break;
  }

  return false;
}

/**
 * 좌석 우선순위 계산 (과거배치 로직에서 가져옴)
 *
 * 열 범위 제약을 엄격하게 적용:
 * - Priority 0: 선호행 + 열 범위 내 (가장 선호)
 * - Priority 1: 오버플로우행 + 열 범위 내
 * - Priority 2: 선호행 + 열 범위 외 (fallback, 다른 파트 영역 아닐 때만)
 * - Priority 3: 오버플로우행 + 열 범위 외 (최후 수단, 다른 파트 영역 아닐 때만)
 * - Priority 5: 금지 영역 (다른 파트 영역 포함)
 */
function getSeatPriority(
  row: number,
  col: number,
  part: string,
  rowCapacity: number
): number {
  const rules = PART_PLACEMENT_RULES[part as keyof typeof PART_PLACEMENT_RULES];
  if (!rules) return 5;

  // readonly 배열이므로 타입 캐스팅
  const preferredRows = rules.preferredRows as readonly number[];
  const overflowRows = rules.overflowRows as readonly number[];

  const inPreferredRow = preferredRows.includes(row);
  const inOverflowRow = overflowRows.includes(row);
  const colConstraint = getAdjustedColConstraints(part, row, rowCapacity);
  const inColRange = colConstraint
    ? col >= colConstraint.min && col <= colConstraint.max
    : true;

  // === 수정: Row 4-6에서 열 범위 상관없이 다른 파트 영역 침범 확인 ===
  // 열 범위 체크보다 먼저 수행하여 다른 파트 영역 침범 방지
  if (row >= 4 && isInOtherPartTerritory(row, col, part, rowCapacity)) {
    return 5; // 다른 파트 영역 침범 - 무조건 금지
  }

  // 열 범위 내 좌석 우선 (위 체크 통과 후)
  if (inPreferredRow && inColRange) return 0;   // 최고: 선호행 + 열범위 내
  if (inOverflowRow && inColRange) return 1;    // 오버플로우 + 열범위 내

  // 열 범위 밖 fallback (다른 파트 영역이 아닌 경우에만)
  if (inPreferredRow) return 2;                 // 선호행 + 열범위 밖
  if (inOverflowRow) return 3;                  // 오버플로우 + 열범위 밖

  return 5;  // 금지 영역
}

/**
 * 대원별 이전 배치 이력에서 선호 좌석 계산
 *
 * ML 데이터 분석 결과 (2부예배 43회, 103명 대원):
 * - 평균 행 일관성: 82.2%
 * - 평균 열 일관성 (±2열): 92.5%
 * - 고정석 대원 비율: 61.2% (행/열 모두 80%+ 일관성)
 */
export function calculatePreferredSeats(
  histories: SeatHistory[]
): Map<string, PreferredSeat> {
  const preferredSeats = new Map<string, PreferredSeat>();

  for (const history of histories) {
    if (history.positions.length < FIXED_SEAT_CONFIG.MIN_APPEARANCES) {
      continue;
    }

    const rows = history.positions.map(p => p.row);
    const cols = history.positions.map(p => p.col);

    // 가장 많이 앉은 행 찾기
    const rowCounts = new Map<number, number>();
    for (const row of rows) {
      rowCounts.set(row, (rowCounts.get(row) || 0) + 1);
    }
    let preferredRow = rows[0];
    let maxRowCount = 0;
    for (const [row, count] of rowCounts) {
      if (count > maxRowCount) {
        maxRowCount = count;
        preferredRow = row;
      }
    }

    // 행 일관성: 가장 많이 앉은 행에 앉은 비율
    const rowConsistency = maxRowCount / rows.length;

    // 평균 열 위치
    const avgCol = cols.reduce((a, b) => a + b, 0) / cols.length;

    // 열 일관성: ±2열 범위 내에 앉은 비율
    const colsInRange = cols.filter(
      c => Math.abs(c - avgCol) <= FIXED_SEAT_CONFIG.COL_TOLERANCE
    ).length;
    const colConsistency = colsInRange / cols.length;

    preferredSeats.set(history.member_id, {
      member_id: history.member_id,
      preferred_row: preferredRow,
      preferred_col: Math.round(avgCol),
      row_consistency: rowConsistency,
      col_consistency: colConsistency,
      total_appearances: history.positions.length,
    });
  }

  return preferredSeats;
}

/**
 * 고정석 성향이 강한 대원인지 확인
 */
export function hasStrongFixedSeatPreference(
  preferredSeat: PreferredSeat | undefined
): boolean {
  if (!preferredSeat) return false;
  return (
    preferredSeat.row_consistency >= FIXED_SEAT_CONFIG.HIGH_CONSISTENCY &&
    preferredSeat.col_consistency >= FIXED_SEAT_CONFIG.HIGH_CONSISTENCY
  );
}

/**
 * 파트별 멤버 그룹화 및 고정석 우선순위 정렬
 *
 * 최적화: Partition 방식 적용
 * - 기존: O(M log M) 전체 정렬
 * - 최적화: O(M) 파티션 + O(F log F) 고정석만 정렬
 *   (F = 고정석 대원 수, 일반적으로 M의 61.2%)
 */
function groupAndSortMembers(
  members: Member[],
  preferredSeats?: Map<string, PreferredSeat>
): Record<string, Member[]> {
  const grouped: Record<string, Member[]> = {
    SOPRANO: [],
    ALTO: [],
    TENOR: [],
    BASS: [],
  };

  members.forEach(member => {
    grouped[member.part].push(member);
  });

  // 고정석 정보가 있으면 Partition 방식으로 정렬 (최적화)
  if (preferredSeats) {
    for (const part of Object.keys(grouped)) {
      const partMembers = grouped[part];

      // 1단계: O(M) 파티션 - 고정석/비고정석 분리
      const fixed: Member[] = [];
      const nonFixed: Member[] = [];

      for (const member of partMembers) {
        const pref = preferredSeats.get(member.id);
        if (hasStrongFixedSeatPreference(pref)) {
          fixed.push(member);
        } else {
          nonFixed.push(member);
        }
      }

      // 2단계: O(F log F) - 고정석 대원만 출석 횟수 기준 정렬
      if (fixed.length > 1) {
        fixed.sort((a, b) => {
          const prefA = preferredSeats.get(a.id);
          const prefB = preferredSeats.get(b.id);
          return (prefB?.total_appearances || 0) - (prefA?.total_appearances || 0);
        });
      }

      // 3단계: 재조합 - 고정석 우선, 비고정석 순서 유지
      grouped[part] = [...fixed, ...nonFixed];
    }
  }

  return grouped;
}

/**
 * 행별로 각 파트를 몇 명씩 배치할지 계산
 *
 * 배치 전략 (ML 데이터 분석 기반):
 *
 * [4-6행: TENOR/BASS 중앙 우선 배치]
 * 1. TENOR/BASS를 4-6행 중앙부터 양쪽으로 확장하며 배치
 *
 * [1-3행: SOPRANO/ALTO 배치]
 * 2. SOPRANO를 1-3행 왼쪽에 배치
 * 3. ALTO를 1-3행 오른쪽에 배치
 *
 * [Overflow 처리]
 * 4. SOPRANO overflow: 4-6행 왼쪽 가장자리에 배치 (TENOR 옆)
 * 5. ALTO overflow: 4-5행 오른쪽 가장자리에 배치 (BASS 옆) - 6행 금지!
 *
 * 중요 원칙:
 * - 알토는 절대 6행에 배치하지 않음
 * - overflow된 소프라노/알토는 기존 파트와 연속되도록 가장자리에 배치
 */
interface RowDistribution {
  SOPRANO: number;
  ALTO: number;
  TENOR: number;
  BASS: number;
}

/**
 * 최적화: 행별 누적 합계 유지로 O(R × 4) → O(R) 감소
 */
/**
 * 물리적 최대 행 용량 (UI 그리드 기준)
 * 미배치 방지를 위해 rowCapacities보다 큰 경우에도 배치 허용
 */
const MAX_ROW_CAPACITY = 16;

function distributePartsToRows(
  partCounts: Record<string, number>,
  rowCapacities: number[]
): Record<number, RowDistribution> {
  const distribution: Record<number, RowDistribution> = {};
  const numRows = rowCapacities.length;

  // 각 행 초기화 + 행별 누적 합계 배열 (최적화)
  const rowTotals: number[] = new Array(numRows).fill(0);
  for (let row = 1; row <= numRows; row++) {
    distribution[row] = { SOPRANO: 0, ALTO: 0, TENOR: 0, BASS: 0 };
  }

  let sopranoRemaining = partCounts.SOPRANO || 0;
  let altoRemaining = partCounts.ALTO || 0;
  let tenorRemaining = partCounts.TENOR || 0;
  let bassRemaining = partCounts.BASS || 0;

  const totalMembers = sopranoRemaining + altoRemaining + tenorRemaining + bassRemaining;
  if (totalMembers === 0) return distribution;

  // === 인원 비율 기반 중앙점 계산 ===
  // SOPRANO/ALTO 비율로 1-3행 좌우 분할 (overlap 영역 동적 분배)
  const sopranoAltoTotal = sopranoRemaining + altoRemaining;
  const sopranoRatio = sopranoAltoTotal > 0 ? sopranoRemaining / sopranoAltoTotal : 0.5;

  // TENOR/BASS 비율로 4-6행 좌우 분할
  const tenorBassTotal = tenorRemaining + bassRemaining;
  const tenorRatio = tenorBassTotal > 0 ? tenorRemaining / tenorBassTotal : 0.5;

  // === STEP 1: 1-3행에 SOPRANO/ALTO 먼저 배치 (인원 비율 기반) ===
  // SOPRANO/ALTO를 먼저 배치하여 overflow 영역 확보
  for (let row = 1; row <= Math.min(3, numRows); row++) {
    const rowCapacity = rowCapacities[row - 1];
    // 인원 비율로 좌우 분할 (overlap 영역 동적 분배)
    const sopranoCapacity = Math.round(rowCapacity * sopranoRatio);
    const altoCapacity = rowCapacity - sopranoCapacity;

    // SOPRANO 배치 (왼쪽)
    const sopranoToPlace = Math.min(sopranoRemaining, sopranoCapacity);
    distribution[row].SOPRANO = sopranoToPlace;
    sopranoRemaining -= sopranoToPlace;
    rowTotals[row - 1] += sopranoToPlace;

    // ALTO 배치 (오른쪽)
    const altoToPlace = Math.min(altoRemaining, altoCapacity);
    distribution[row].ALTO = altoToPlace;
    altoRemaining -= altoToPlace;
    rowTotals[row - 1] += altoToPlace;
  }

  // === STEP 2: SOPRANO overflow → 4-6행 왼쪽 가장자리 (용량 비율 분배) ===
  // 하이브리드 분배: 행 용량(5:4:2) 비율로 각 행에 균등 분산
  // 학습 범위 내 열만 사용 (SOPRANO 4행: 1-5, 5행: 1-4, 6행: 1-2)
  if (sopranoRemaining > 0) {
    // 학습된 SOPRANO overflow 용량 (각 행별 max열 기준)
    const sopranoOverflowCaps: Record<number, number> = { 4: 5, 5: 4, 6: 2 };
    const totalCapacity = 5 + 4 + 2; // 11

    // 각 행의 가용 공간 확인
    const availableRows: number[] = [];
    for (const row of [4, 5, 6]) {
      if (row <= numRows) {
        const available = Math.min(
          sopranoOverflowCaps[row] || 0,
          rowCapacities[row - 1] - rowTotals[row - 1]
        );
        if (available > 0) availableRows.push(row);
      }
    }

    // 용량 비율로 각 행 할당량 계산 (5:4:2 = 45%:36%:18%)
    const initialAlloc: Record<number, number> = { 4: 0, 5: 0, 6: 0 };

    for (const row of availableRows) {
      // 행 용량을 기준으로 비율 계산
      const capacityRatio = sopranoOverflowCaps[row] / totalCapacity;
      const maxCap = Math.min(
        sopranoOverflowCaps[row] || 0,
        rowCapacities[row - 1] - rowTotals[row - 1]
      );
      // 비율에 따라 할당 (반올림), 최대 용량 제한
      initialAlloc[row] = Math.min(Math.round(sopranoRemaining * capacityRatio), maxCap);
    }

    // 할당량 합계 조정 (반올림 오차 보정)
    let totalAlloc = initialAlloc[4] + initialAlloc[5] + initialAlloc[6];

    // 부족하면 가용 공간이 있는 행에 추가
    while (totalAlloc < sopranoRemaining) {
      for (const row of [4, 5, 6]) {
        if (totalAlloc >= sopranoRemaining) break;
        const maxCap = Math.min(
          sopranoOverflowCaps[row] || 0,
          rowCapacities[row - 1] - rowTotals[row - 1]
        );
        if (initialAlloc[row] < maxCap) {
          initialAlloc[row]++;
          totalAlloc++;
        }
      }
      // 무한 루프 방지
      if (totalAlloc === initialAlloc[4] + initialAlloc[5] + initialAlloc[6]) break;
      totalAlloc = initialAlloc[4] + initialAlloc[5] + initialAlloc[6];
    }

    // 초과하면 가장 많은 행에서 감소
    while (totalAlloc > sopranoRemaining) {
      for (const row of [6, 5, 4]) { // 뒤에서부터 감소
        if (totalAlloc <= sopranoRemaining) break;
        if (initialAlloc[row] > 0) {
          initialAlloc[row]--;
          totalAlloc--;
        }
      }
    }

    // 분배 적용
    for (const row of [4, 5, 6]) {
      if (initialAlloc[row] > 0) {
        distribution[row].SOPRANO = initialAlloc[row];
        sopranoRemaining -= initialAlloc[row];
        rowTotals[row - 1] += initialAlloc[row];
      }
    }
  }

  // === STEP 3: ALTO overflow → 4행에만 배치 (5-6행 금지) ===
  // 동적 용량: 학습 범위 기준 6석이지만, ALTO 인원이 많으면 확장
  if (altoRemaining > 0 && numRows >= 4) {
    const row = 4;
    const rowCapacity = rowCapacities[row - 1];
    const availableSpace = rowCapacity - rowTotals[row - 1];

    // 동적 overflow 용량: 기본 6석, 필요시 가용 공간까지 확장
    // ALTO 전원 배치를 위해 필요한 만큼 사용
    const baseOverflowCap = 6;
    const altoOverflowCap = Math.min(
      Math.max(baseOverflowCap, altoRemaining), // 필요한 만큼 확장
      availableSpace // 최대 가용 공간까지
    );

    if (altoOverflowCap > 0) {
      const toPlace = Math.min(altoRemaining, altoOverflowCap);
      distribution[row].ALTO += toPlace;
      altoRemaining -= toPlace;
      rowTotals[row - 1] += toPlace;
    }
  }

  // === STEP 4: 4-6행에 TENOR/BASS 배치 (남은 공간) ===
  // SOPRANO/ALTO overflow 이후 남은 공간에 배치
  for (let row = 4; row <= numRows; row++) {
    const rowCapacity = rowCapacities[row - 1];
    const usedSpace = rowTotals[row - 1];
    const availableSpace = rowCapacity - usedSpace;

    if (availableSpace <= 0) continue;

    // TENOR/BASS 인원 비율로 분배
    const currentTenorRatio = (tenorRemaining + bassRemaining > 0)
      ? tenorRemaining / (tenorRemaining + bassRemaining)
      : tenorRatio;

    const tenorForThisRow = Math.round(availableSpace * currentTenorRatio);
    const bassForThisRow = availableSpace - tenorForThisRow;

    // TENOR 배치
    const tenorToPlace = Math.min(tenorRemaining, tenorForThisRow);
    distribution[row].TENOR = tenorToPlace;
    tenorRemaining -= tenorToPlace;
    rowTotals[row - 1] += tenorToPlace;

    // BASS 배치
    const bassToPlace = Math.min(bassRemaining, bassForThisRow);
    distribution[row].BASS = bassToPlace;
    bassRemaining -= bassToPlace;
    rowTotals[row - 1] += bassToPlace;
  }

  // === STEP 5: 남은 TENOR/BASS 추가 배치 ===
  // MAX_ROW_CAPACITY까지 확장하여 미배치 방지
  if (tenorRemaining > 0 || bassRemaining > 0) {
    for (let row = 4; row <= numRows; row++) {
      let availableSpace = MAX_ROW_CAPACITY - rowTotals[row - 1];

      if (tenorRemaining > 0 && availableSpace > 0) {
        const toPlace = Math.min(tenorRemaining, availableSpace);
        distribution[row].TENOR += toPlace;
        tenorRemaining -= toPlace;
        availableSpace -= toPlace;
        rowTotals[row - 1] += toPlace;
      }

      if (bassRemaining > 0 && availableSpace > 0) {
        const toPlace = Math.min(bassRemaining, availableSpace);
        distribution[row].BASS += toPlace;
        bassRemaining -= toPlace;
        rowTotals[row - 1] += toPlace;
      }
    }
  }

  // === STEP 6: 최후의 수단 - 남은 인원이 있으면 아무 빈공간에 ===
  // SOPRANO overflow 추가
  if (sopranoRemaining > 0) {
    for (let row = 4; row <= numRows; row++) {
      if (sopranoRemaining === 0) break;
      const availableSpace = MAX_ROW_CAPACITY - rowTotals[row - 1];
      if (availableSpace > 0) {
        const toPlace = Math.min(sopranoRemaining, availableSpace);
        distribution[row].SOPRANO += toPlace;
        sopranoRemaining -= toPlace;
        rowTotals[row - 1] += toPlace;
      }
    }
  }

  // ALTO 남은 인원 - 4행까지만 재시도 (5-6행 금지 유지)
  if (altoRemaining > 0) {
    for (let row = 1; row <= Math.min(4, numRows); row++) {
      if (altoRemaining === 0) break;
      const availableSpace = MAX_ROW_CAPACITY - rowTotals[row - 1];
      if (availableSpace > 0) {
        const toPlace = Math.min(altoRemaining, availableSpace);
        distribution[row].ALTO += toPlace;
        altoRemaining -= toPlace;
        rowTotals[row - 1] += toPlace;
      }
    }
  }

  return distribution;
}

/**
 * 행별로 좌석 배치 (ML 선호좌석 우선 배치 v2)
 *
 * 배치 전략 (과거배치 로직에서 가져온 개선사항):
 * 1. 고정석 대원: 선호 좌석 직접 배치 시도
 * 2. 실패 시: 같은 행 내 가장 가까운 빈 열
 * 3. 그래도 실패 시: 우선순위 기반 순차 배치
 *
 * 좌석 우선순위 시스템 (4단계):
 * - Priority 0: 선호행 + 열 범위 내 (가장 선호)
 * - Priority 1: 선호행 + 열 범위 외
 * - Priority 2: 오버플로우행 + 열 범위 내
 * - Priority 3: 오버플로우행 + 열 범위 외
 */
function assignSeatsToRows(
  membersByPart: Record<string, Member[]>,
  distribution: Record<number, RowDistribution>,
  rowCapacities: number[],
  preferredSeats?: Map<string, PreferredSeat>
): Seat[] {
  const seats: Seat[] = [];
  const numRows = rowCapacities.length;

  // 점유된 좌석 추적 (row:col 형식)
  const occupiedSeats = new Set<string>();
  const seatKey = (row: number, col: number) => `${row}:${col}`;

  // === 행별 배치 할당량 추적 (distribution 기반) ===
  // overflow 행에서 각 파트가 배치할 수 있는 남은 좌석 수
  const remainingAllocation: Record<string, Record<number, number>> = {
    SOPRANO: { 4: distribution[4]?.SOPRANO || 0, 5: distribution[5]?.SOPRANO || 0, 6: distribution[6]?.SOPRANO || 0 },
    ALTO: { 4: distribution[4]?.ALTO || 0 },
  };

  // === 인원 비율 기반 중앙점 계산 ===
  const sopranoCount = membersByPart.SOPRANO?.length || 0;
  const altoCount = membersByPart.ALTO?.length || 0;
  const tenorCount = membersByPart.TENOR?.length || 0;
  const bassCount = membersByPart.BASS?.length || 0;

  // SOPRANO/ALTO 비율로 1-3행 중앙점 계산
  const sopranoAltoTotal = sopranoCount + altoCount;
  const sopranoRatio = sopranoAltoTotal > 0 ? sopranoCount / sopranoAltoTotal : 0.5;

  // TENOR/BASS 비율로 4-6행 중앙점 계산
  const tenorBassTotal = tenorCount + bassCount;
  const tenorRatio = tenorBassTotal > 0 ? tenorCount / tenorBassTotal : 0.5;

  // 행별로 배치 가능한 좌석 생성
  interface AvailableSeat {
    row: number;
    col: number;
    priority: number;
  }

  // 파트별로 배치 가능한 좌석 목록 생성 (우선순위 정렬)
  function getAvailableSeatsForPart(part: string): AvailableSeat[] {
    const availableSeats: AvailableSeat[] = [];

    // === TENOR/BASS: 중앙 기준 좌우 분할 배치 (6행 → 5행 → 4행) ===
    if (part === 'TENOR' || part === 'BASS') {
      // 6행 → 5행 → 4행 순서로 (뒤에서부터 채움)
      for (const row of [6, 5, 4]) {
        if (row > numRows) continue;

        const rowCap = rowCapacities[row - 1];
        // 인원 비율 기반 중앙점 (TENOR/BASS 비율)
        const midCol = Math.round(rowCap * tenorRatio);

        if (part === 'TENOR') {
          // TENOR: 중앙에서 왼쪽으로 확장 (midCol → SOPRANO overflow max + 1)
          // SOPRANO overflow 영역은 예약하여 침범 방지
          const sopranoOverflowCol = getAdjustedColConstraints('SOPRANO', row, rowCap);
          const tenorMinCol = (sopranoOverflowCol?.max ?? 5) + 1;

          for (let col = midCol; col >= tenorMinCol; col--) {
            if (!occupiedSeats.has(seatKey(row, col))) {
              availableSeats.push({ row, col, priority: 0 });
            }
          }
        } else {
          // BASS: 중앙에서 오른쪽으로 확장 (midCol+1 → bassMaxCol)
          // Row 4에서는 ALTO overflow 영역 예약 (침범 방지)
          let bassMaxCol = rowCap;
          if (row === 4) {
            const altoOverflowCol = getAdjustedColConstraints('ALTO', row, rowCap);
            if (altoOverflowCol) {
              bassMaxCol = altoOverflowCol.min - 1; // ALTO min 직전까지만
            }
          }

          for (let col = midCol + 1; col <= bassMaxCol; col++) {
            if (!occupiedSeats.has(seatKey(row, col))) {
              availableSeats.push({ row, col, priority: 0 });
            }
          }
        }
      }
      return availableSeats; // 이미 원하는 순서로 정렬됨
    }

    // === SOPRANO/ALTO: 중앙 기준 좌우 분할 배치 (1-3행) ===
    if (part === 'SOPRANO' || part === 'ALTO') {
      // 1행 → 2행 → 3행 순서 (앞에서부터 채움)
      for (const row of [1, 2, 3]) {
        if (row > numRows) continue;

        const rowCap = rowCapacities[row - 1];
        // 인원 비율 기반 중앙점 (SOPRANO/ALTO 비율)
        const midCol = Math.round(rowCap * sopranoRatio);

        if (part === 'SOPRANO') {
          // SOPRANO: 중앙에서 왼쪽으로 확장 (midCol → 1)
          for (let col = midCol; col >= 1; col--) {
            if (!occupiedSeats.has(seatKey(row, col))) {
              availableSeats.push({ row, col, priority: 0 });
            }
          }
        } else {
          // ALTO: 중앙에서 오른쪽으로 확장 (midCol+1 → rowCap)
          for (let col = midCol + 1; col <= rowCap; col++) {
            if (!occupiedSeats.has(seatKey(row, col))) {
              availableSeats.push({ row, col, priority: 0 });
            }
          }
        }
      }

      // Overflow 행 추가 (파트 영역 규칙 내, priority 1)
      if (part === 'SOPRANO') {
        // SOPRANO overflow: 행별 할당량(remainingAllocation)에 맞게 좌석 배분
        // findBestSeat가 행 기준 정렬하므로, 할당량만큼만 좌석 반환하여 균등 분배

        // 각 행의 남은 할당량 확인
        const sopranoAlloc: Record<number, number> = {
          4: remainingAllocation.SOPRANO[4] || 0,
          5: remainingAllocation.SOPRANO[5] || 0,
          6: remainingAllocation.SOPRANO[6] || 0
        };

        // 각 행의 가용 좌석 수집 (col 1부터 순서대로)
        const rowSeats: Record<number, Array<{ row: number; col: number }>> = { 4: [], 5: [], 6: [] };
        for (const row of [4, 5, 6]) {
          if (row > numRows || sopranoAlloc[row] <= 0) continue;
          const rowCap = rowCapacities[row - 1];
          const sopranoCol = getAdjustedColConstraints('SOPRANO', row, rowCap);
          const maxCol = sopranoCol?.max ?? 0;
          for (let col = 1; col <= maxCol; col++) {
            if (!occupiedSeats.has(seatKey(row, col))) {
              rowSeats[row].push({ row, col });
            }
          }
        }

        // 각 행에서 할당량만큼만 좌석 추가
        // findBestSeat가 행 기준 정렬하므로, 할당량 초과 좌석은 제외
        for (const row of [4, 5, 6]) {
          const allocLimit = sopranoAlloc[row];
          const seats = rowSeats[row].slice(0, allocLimit); // 할당량만큼만
          for (const seat of seats) {
            availableSeats.push({ ...seat, priority: 1 });
          }
        }
      } else {
        // ALTO overflow: 4행만 (5-6행 금지, 학습 데이터상 4행만 존재)
        // 오른쪽 끝(col 14)부터 안쪽으로 채움
        const row = 4;
        if (row <= numRows) {
          const rowCap = rowCapacities[row - 1];
          const altoCol = getAdjustedColConstraints('ALTO', row, rowCap);
          if (altoCol) {
            // 오른쪽 끝부터 안쪽으로: col 14 → 13 → 12 → 11
            const maxCol = Math.min(altoCol.max, rowCap);
            for (let col = maxCol; col >= altoCol.min; col--) {
              if (!occupiedSeats.has(seatKey(row, col))) {
                availableSeats.push({ row, col, priority: 1 });
              }
            }
          }
        }
      }

      return availableSeats; // 이미 원하는 순서로 정렬됨
    }

    // === Fallback: 기존 학습 범위 기반 배치 (SPECIAL 등) ===
    for (let row = 1; row <= numRows; row++) {
      const rowCapacity = rowCapacities[row - 1];
      for (let col = 1; col <= rowCapacity; col++) {
        if (occupiedSeats.has(seatKey(row, col))) continue;

        const priority = getSeatPriority(row, col, part, rowCapacity);
        if (priority <= 3) {  // 금지 영역(4) 제외
          availableSeats.push({ row, col, priority });
        }
      }
    }

    // 우선순위 → 행 → avg 거리 순으로 정렬
    availableSeats.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.row !== b.row) return a.row - b.row;

      const constraintA = getAdjustedColConstraints(part, a.row, rowCapacities[a.row - 1]);
      const constraintB = getAdjustedColConstraints(part, b.row, rowCapacities[b.row - 1]);
      const avgA = constraintA?.avg ?? a.col;
      const avgB = constraintB?.avg ?? b.col;

      return Math.abs(a.col - avgA) - Math.abs(b.col - avgB);
    });

    return availableSeats;
  }

  // 선호 좌석 또는 가장 가까운 빈 좌석 찾기
  function findBestSeat(
    member: Member,
    preference: PreferredSeat | undefined,
    availableSeats: AvailableSeat[]
  ): AvailableSeat | null {
    if (!preference || !hasStrongFixedSeatPreference(preference)) {
      // 비고정석 대원: 파트 avg 열 기반 배치 (휴직 복귀 등 기록 없는 대원 포함)
      const rules = PART_PLACEMENT_RULES[member.part as keyof typeof PART_PLACEMENT_RULES];
      if (rules) {
        const partPreferredRows = rules.preferredRows as readonly number[];
        const targetRow = partPreferredRows[0] || 4;
        const targetRowCapacity = rowCapacities[targetRow - 1] || 15;
        const constraint = getAdjustedColConstraints(member.part, targetRow, targetRowCapacity);

        if (constraint) {
          const targetCol = Math.round(constraint.avg);

          // 열 범위 내 좌석만 필터 (priority 0-1)
          const inRangeSeats = availableSeats.filter(s => s.priority <= 1);
          if (inRangeSeats.length > 0) {
            // 행 우선, 그 다음 avg 거리 순 정렬
            inRangeSeats.sort((a, b) => {
              if (a.row !== b.row) return a.row - b.row;
              return Math.abs(a.col - targetCol) - Math.abs(b.col - targetCol);
            });
            return inRangeSeats[0];
          }
        }
      }

      // fallback: 우선순위 최상위 좌석 (열 범위 밖 포함)
      return availableSeats.length > 0 ? availableSeats[0] : null;
    }

    const prefRow = preference.preferred_row;
    const prefCol = preference.preferred_col;
    const rowCapacity = rowCapacities[prefRow - 1] || 15;

    // 1순위: 정확히 선호 좌석 (열 범위 내일 때만)
    if (!occupiedSeats.has(seatKey(prefRow, prefCol))) {
      const priority = getSeatPriority(prefRow, prefCol, member.part, rowCapacity);
      // priority 0-1만 허용 (열 범위 내 좌석)
      if (priority <= 1) {
        return { row: prefRow, col: prefCol, priority };
      }
    }

    // 2순위: 같은 행 내 열 범위 내 가장 가까운 열
    const sameRowInRangeSeats = availableSeats.filter(s =>
      s.row === prefRow && s.priority <= 1
    );
    if (sameRowInRangeSeats.length > 0) {
      sameRowInRangeSeats.sort((a, b) =>
        Math.abs(a.col - prefCol) - Math.abs(b.col - prefCol)
      );
      return sameRowInRangeSeats[0];
    }
    // fallback: 열 범위 밖도 허용 (좌석 부족 시)
    const sameRowSeats = availableSeats.filter(s => s.row === prefRow);
    if (sameRowSeats.length > 0) {
      sameRowSeats.sort((a, b) =>
        Math.abs(a.col - prefCol) - Math.abs(b.col - prefCol)
      );
      return sameRowSeats[0];
    }

    // 3순위: 선호행 범위 내 열 범위 우선 좌석
    const rules = PART_PLACEMENT_RULES[member.part as keyof typeof PART_PLACEMENT_RULES];
    if (rules) {
      const partPreferredRows = rules.preferredRows as readonly number[];
      const preferredRowSeats = availableSeats.filter(s =>
        partPreferredRows.includes(s.row)
      );
      if (preferredRowSeats.length > 0) {
        // priority(열 범위) 우선, 그 다음 거리
        preferredRowSeats.sort((a, b) => {
          // 열 범위 내 좌석 우선 (priority 0-1)
          if (a.priority <= 1 && b.priority > 1) return -1;
          if (a.priority > 1 && b.priority <= 1) return 1;
          // 같은 priority 그룹 내에서 거리 정렬
          const distA = Math.abs(a.row - prefRow) + Math.abs(a.col - prefCol) * 0.5;
          const distB = Math.abs(b.row - prefRow) + Math.abs(b.col - prefCol) * 0.5;
          return distA - distB;
        });
        return preferredRowSeats[0];
      }
    }

    // 4순위: 우선순위 최상위 좌석
    return availableSeats.length > 0 ? availableSeats[0] : null;
  }

  // 미배치 대원 추적
  const unplacedMembers: Member[] = [];

  // 파트별로 대원 배치
  // SOPRANO/ALTO를 먼저 처리하여 overflow 영역(5-6행 col 1-3) 확보
  // (TENOR/BASS가 먼저 처리되면 5-6행 col 1-3을 점유하여 SOPRANO overflow 자리 부족)
  for (const part of ['SOPRANO', 'ALTO', 'TENOR', 'BASS'] as const) {
    const members = [...membersByPart[part]];  // 복사본 사용

    // 고정석 대원 우선 정렬 (출석 횟수 높은 순)
    if (preferredSeats) {
      members.sort((a, b) => {
        const prefA = preferredSeats.get(a.id);
        const prefB = preferredSeats.get(b.id);
        const isFixedA = hasStrongFixedSeatPreference(prefA);
        const isFixedB = hasStrongFixedSeatPreference(prefB);

        // 고정석 우선
        if (isFixedA !== isFixedB) return isFixedA ? -1 : 1;
        // 같은 그룹 내에서 출석 횟수 순
        return (prefB?.total_appearances || 0) - (prefA?.total_appearances || 0);
      });
    }

    // 각 대원 배치
    for (const member of members) {
      const preference = preferredSeats?.get(member.id);
      const availableSeats = getAvailableSeatsForPart(part);

      const bestSeat = findBestSeat(member, preference, availableSeats);

      if (bestSeat) {
        seats.push({
          member_id: member.id,
          member_name: member.name,
          part: member.part,
          row: bestSeat.row,
          col: bestSeat.col,
        });
        occupiedSeats.add(seatKey(bestSeat.row, bestSeat.col));

        // === overflow 행 배치 시 할당량 차감 ===
        // SOPRANO: 4-6행 overflow에 배치되면 해당 행 할당량 감소
        if (part === 'SOPRANO' && bestSeat.row >= 4 && bestSeat.row <= 6) {
          if (remainingAllocation.SOPRANO[bestSeat.row] > 0) {
            remainingAllocation.SOPRANO[bestSeat.row]--;
          }
        }
        // ALTO: 4행 overflow에 배치되면 할당량 감소
        if (part === 'ALTO' && bestSeat.row === 4) {
          if (remainingAllocation.ALTO[4] > 0) {
            remainingAllocation.ALTO[4]--;
          }
        }
      } else {
        // 파트 제약 내 좌석이 없으면 미배치 목록에 추가
        unplacedMembers.push(member);
      }
    }

    // 원본 배열 비우기 (다른 로직과의 호환성)
    membersByPart[part] = [];
  }

  // === SMART FALLBACK: 학습된 열 범위(PART_COL_CONSTRAINTS) 기반 미배치 대원 배치 ===
  // 4단계 우선순위: (1) overflow행+학습열범위 → (2) preferred행+학습열범위 → (3) 열범위확장(±2) → (4) 아무빈좌석
  if (unplacedMembers.length > 0) {
    logger.debug(`${unplacedMembers.length}명 미배치 → smart fallback 시도 (학습 데이터 기반)`);

    /**
     * 파트별 fallback 좌석 찾기 (getAdjustedColConstraints 활용)
     */
    const findFallbackSeat = (
      member: Member
    ): { row: number; col: number } | null => {
      const part = member.part;
      const rules = PART_PLACEMENT_RULES[part as keyof typeof PART_PLACEMENT_RULES];
      const preferredRows = rules.preferredRows as readonly number[];
      const overflowRows = rules.overflowRows as readonly number[];

      // 헬퍼: 해당 행에서 오른쪽 파트(ALTO/BASS)의 최소 열 찾기
      const findMinRightPartCol = (rowNum: number): number => {
        let minCol = MAX_ROW_CAPACITY + 1;
        for (const seat of seats) {
          if (seat.row === rowNum && (seat.part === 'ALTO' || seat.part === 'BASS')) {
            if (seat.col < minCol) minCol = seat.col;
          }
        }
        return minCol;
      };

      // 헬퍼: 해당 행에서 왼쪽 파트(SOPRANO/TENOR)의 최대 열 찾기
      const findMaxLeftPartCol = (rowNum: number): number => {
        let maxCol = 0;
        for (const seat of seats) {
          if (seat.row === rowNum && (seat.part === 'SOPRANO' || seat.part === 'TENOR')) {
            if (seat.col > maxCol) maxCol = seat.col;
          }
        }
        return maxCol;
      };

      // 좌우 제약 체크 헬퍼
      const isValidForLeftRightConstraint = (row: number, col: number, partType: string): boolean => {
        const isLeftPart = partType === 'SOPRANO' || partType === 'TENOR';
        if (isLeftPart) {
          const minRightCol = findMinRightPartCol(row);
          return col < minRightCol; // 오른쪽 파트보다 왼쪽에 있어야 함
        } else {
          const maxLeftCol = findMaxLeftPartCol(row);
          return col > maxLeftCol; // 왼쪽 파트보다 오른쪽에 있어야 함
        }
      };

      // 1순위: overflow 행 + 학습된 열 범위 (좌우 제약 포함)
      for (const row of overflowRows) {
        if (row > numRows) continue;
        const rowCap = rowCapacities[row - 1];
        const constraint = getAdjustedColConstraints(part, row, rowCap);
        if (!constraint) continue;

        for (let col = constraint.min; col <= constraint.max; col++) {
          if (occupiedSeats.has(seatKey(row, col))) continue;
          if (!isValidForLeftRightConstraint(row, col, part)) continue;
          return { row, col };
        }
      }

      // 2순위: preferred 행 + 학습된 열 범위 (좌우 제약 포함)
      for (const row of preferredRows) {
        if (row > numRows) continue;
        const rowCap = rowCapacities[row - 1];
        const constraint = getAdjustedColConstraints(part, row, rowCap);
        if (!constraint) continue;

        for (let col = constraint.min; col <= constraint.max; col++) {
          if (occupiedSeats.has(seatKey(row, col))) continue;
          if (!isValidForLeftRightConstraint(row, col, part)) continue;
          return { row, col };
        }
      }

      // 3순위: 모든 허용 행 + 열 범위 확장 (±2열)
      // 다른 파트 영역 침범 방지 체크 + 좌우 제약 포함
      const allAllowedRows = part === 'ALTO'
        ? [1, 2, 3, 4]  // ALTO는 5-6행 금지
        : [...preferredRows, ...overflowRows];

      for (const row of allAllowedRows) {
        if (row > numRows) continue;
        const rowCap = rowCapacities[row - 1];
        const constraint = getAdjustedColConstraints(part, row, rowCap);
        if (!constraint) continue;

        // 열 범위 확장 (±2열)
        const extendedMin = Math.max(1, constraint.min - 2);
        const extendedMax = Math.min(rowCap, constraint.max + 2);

        for (let col = extendedMin; col <= extendedMax; col++) {
          if (occupiedSeats.has(seatKey(row, col))) continue;
          // 다른 파트 영역 침범 체크 (SOPRANO overflow, ALTO overflow 등)
          if (isInOtherPartTerritory(row, col, part, rowCap)) continue;
          // 좌우 제약 체크
          if (!isValidForLeftRightConstraint(row, col, part)) continue;
          return { row, col };
        }
      }

      // 4순위: 아무 빈좌석 (파트 영역 체크 포함)
      // - ALTO: 5-6행 금지 → [1, 2, 3, 4]
      // - TENOR/BASS: 1-3행 금지 → [4, 5, 6]
      // - SOPRANO: 모든 행 허용
      // 4-1: 다른 파트 영역 침범 안 하는 빈좌석 우선
      const lastResortRows = part === 'ALTO'
        ? [1, 2, 3, 4]
        : part === 'TENOR' || part === 'BASS'
          ? [4, 5, 6].filter(r => r <= numRows)
          : Array.from({ length: numRows }, (_, i) => i + 1);

      for (const row of lastResortRows) {
        const rowCap = rowCapacities[row - 1];
        for (let col = 1; col <= rowCap; col++) {
          if (occupiedSeats.has(seatKey(row, col))) continue;
          // 다른 파트 영역 침범 체크
          if (isInOtherPartTerritory(row, col, part, rowCap)) continue;
          return { row, col };
        }
      }

      // 4-2: ALTO는 row 5-6 오른쪽 끝 허용 (row 4 col 1-3 SOPRANO영역보다 나음)
      // Row 5-6의 오른쪽 끝 열은 다른 파트의 학습 범위 밖이므로 neutral zone
      if (part === 'ALTO') {
        for (const row of [5, 6]) {
          if (row > numRows) continue;
          const rowCap = rowCapacities[row - 1];
          // row 5-6 오른쪽 끝에서 빈자리 찾기 (rowCap부터 역순)
          // BASS max를 초과하는 영역은 neutral zone
          const bassCol = getAdjustedColConstraints('BASS', row, rowCap);
          const startCol = bassCol ? bassCol.max + 1 : rowCap - 2;
          for (let col = rowCap; col >= Math.max(startCol, rowCap - 3); col--) {
            if (!occupiedSeats.has(seatKey(row, col))) {
              logger.debug(`${member.name}(${part}) row ${row} 오른쪽 배치: ${row}행 ${col}열`);
              return { row, col };
            }
          }
        }
      } else if (part === 'TENOR') {
        // TENOR: 학습 범위 직후 ~ BASS 평균값 사이 (overflow 영역)
        for (const row of [4, 5, 6]) {
          if (row > numRows) continue;
          const rowCap = rowCapacities[row - 1];
          const tenorCol = getAdjustedColConstraints('TENOR', row, rowCap);
          const bassCol = getAdjustedColConstraints('BASS', row, rowCap);
          if (!tenorCol || !bassCol) continue;
          // TENOR overflow: tenorCol.max+1 ~ BASS 평균값 (bassCol.avg)
          // BASS min과 TENOR max가 오버랩되는 경우에도 유효한 범위 생성
          const overflowMin = tenorCol.max + 1;
          const overflowMax = Math.min(
            Math.floor(bassCol.avg),  // BASS 평균값까지만
            rowCap - 2                // 안전 마진
          );
          for (let col = overflowMin; col <= overflowMax; col++) {
            if (!occupiedSeats.has(seatKey(row, col))) {
              logger.debug(`${member.name}(${part}) overflow 영역 배치: ${row}행 ${col}열`);
              return { row, col };
            }
          }
        }
      }

      // 4-3: 정말 좌석이 없으면 아무 빈좌석 (최후의 수단)
      // MAX_ROW_CAPACITY 사용: distribution이 rowCapacities 초과 배분할 수 있음
      // 좌우 분할 규칙 유지: SOPRANO/TENOR는 왼쪽부터, ALTO/BASS는 오른쪽부터 탐색
      const isLeftPart = part === 'SOPRANO' || part === 'TENOR';

      for (const row of lastResortRows) {
        const maxCap = MAX_ROW_CAPACITY; // rowCapacities 초과 허용
        const rowCap = rowCapacities[row - 1];

        if (isLeftPart) {
          // 왼쪽 파트: col 1부터 순차 탐색
          // 이미 배치된 오른쪽 파트보다 오른쪽으로 가지 않음
          const minRightCol = findMinRightPartCol(row);
          for (let col = 1; col <= maxCap; col++) {
            if (occupiedSeats.has(seatKey(row, col))) continue;
            // 기존 오른쪽 파트보다 오른쪽에 배치하지 않음
            if (col >= minRightCol) continue;
            // TENOR는 BASS 전용 영역(col >= BASS.min) 피함
            if (part === 'TENOR' && row >= 4) {
              const bassCol = getAdjustedColConstraints('BASS', row, rowCap);
              if (bassCol && col >= bassCol.min) continue;
            }
            logger.warn(`${member.name}(${part}) 최후 배치: ${row}행 ${col}열 (영역 침범 불가피)`);
            return { row, col };
          }
        } else {
          // 오른쪽 파트: col maxCap부터 역순 탐색
          // 이미 배치된 왼쪽 파트보다 왼쪽으로 가지 않음
          const maxLeftCol = findMaxLeftPartCol(row);
          for (let col = maxCap; col >= 1; col--) {
            if (occupiedSeats.has(seatKey(row, col))) continue;
            // 기존 왼쪽 파트보다 왼쪽에 배치하지 않음
            if (col <= maxLeftCol) continue;
            logger.warn(`${member.name}(${part}) 최후 배치: ${row}행 ${col}열 (영역 침범 불가피)`);
            return { row, col };
          }
        }
      }

      // 4-4: TENOR 전용 - BASS 영역 진입하되, 기존 BASS보다 오른쪽으로 가지 않음
      if (part === 'TENOR') {
        for (const row of lastResortRows) {
          const rowCap = rowCapacities[row - 1];
          const bassCol = getAdjustedColConstraints('BASS', row, rowCap);
          const minRightCol = findMinRightPartCol(row);  // 기존 ALTO/BASS 위치
          // BASS avg까지만 허용, 그리고 기존 오른쪽 파트보다 왼쪽에 배치
          const maxAllowedCol = Math.min(
            bassCol ? Math.floor(bassCol.avg) : rowCap,
            minRightCol - 1
          );
          for (let col = 1; col <= maxAllowedCol; col++) {
            if (!occupiedSeats.has(seatKey(row, col))) {
              logger.warn(`${member.name}(${part}) BASS 경계 배치: ${row}행 ${col}열 (수작업 최소화)`);
              return { row, col };
            }
          }
        }
      }

      // 4-5: 최후의 최후 - TENOR/BASS가 rows 4-6에서 자리를 못 찾으면 모든 행 허용
      // 좌우 분할 규칙 강화: 기존 반대 파트 위치 존중
      // TENOR/BASS는 선호 행(4-6)을 먼저 탐색, 그 후 rows 1-3
      if (part === 'TENOR' || part === 'BASS') {
        // 선호 행 먼저, 그 후 나머지 행
        const preferredRows = Array.from(
          { length: Math.max(0, numRows - 3) },
          (_, i) => i + 4
        ).filter(r => r <= numRows);
        const otherRows = [1, 2, 3].filter(r => r <= numRows);
        const orderedRows = [...preferredRows, ...otherRows];

        for (const row of orderedRows) {
          const rowCap = rowCapacities[row - 1];
          const midPoint = Math.ceil(rowCap / 2);  // 중간점 계산

          if (part === 'TENOR') {
            // TENOR: 왼쪽부터 탐색, 기존 오른쪽 파트보다 오른쪽으로 가지 않음
            const minRightCol = findMinRightPartCol(row);
            const maxCol = Math.min(
              row <= 3 ? midPoint : MAX_ROW_CAPACITY,
              minRightCol - 1
            );
            for (let col = 1; col <= maxCol; col++) {
              if (!occupiedSeats.has(seatKey(row, col))) {
                logger.warn(`${member.name}(${part}) 최후의 최후 배치: ${row}행 ${col}열`);
                return { row, col };
              }
            }
          } else {
            // BASS: 오른쪽부터 탐색, 기존 왼쪽 파트보다 왼쪽으로 가지 않음
            const maxLeftCol = findMaxLeftPartCol(row);
            const minCol = Math.max(
              row <= 3 ? midPoint + 1 : 1,
              maxLeftCol + 1
            );
            for (let col = MAX_ROW_CAPACITY; col >= minCol; col--) {
              if (!occupiedSeats.has(seatKey(row, col))) {
                logger.warn(`${member.name}(${part}) 최후의 최후 배치: ${row}행 ${col}열`);
                return { row, col };
              }
            }
          }
        }
      }

      // 4-6: 절대 최후 - 모든 제약 무시, 빈 좌석 아무데나 배치 (배치 실패 방지)
      // TENOR/BASS는 선호 행(4-6)을 먼저 탐색
      const isLowerPart = part === 'TENOR' || part === 'BASS';
      const rows46 = isLowerPart
        ? [...Array.from({ length: Math.max(0, numRows - 3) }, (_, i) => i + 4).filter(r => r <= numRows),
           ...Array.from({ length: Math.min(3, numRows) }, (_, i) => i + 1)]
        : Array.from({ length: numRows }, (_, i) => i + 1);

      for (const row of rows46) {
        for (let col = 1; col <= MAX_ROW_CAPACITY; col++) {
          if (!occupiedSeats.has(seatKey(row, col))) {
            logger.warn(`${member.name}(${part}) 절대 최후 배치: ${row}행 ${col}열 (제약 무시)`);
            return { row, col };
          }
        }
      }

      return null;
    };

    for (const member of unplacedMembers) {
      const fallbackSeat = findFallbackSeat(member);

      if (fallbackSeat) {
        seats.push({
          member_id: member.id,
          member_name: member.name,
          part: member.part,
          row: fallbackSeat.row,
          col: fallbackSeat.col,
        });
        occupiedSeats.add(seatKey(fallbackSeat.row, fallbackSeat.col));
      } else {
        logger.warn(`${member.name}(${member.part}) 배치 실패: 좌석 부족`);
      }
    }
  }

  // === 후처리: 좌우 분할 위반 수정 ===
  // 같은 행에서 왼쪽 파트(SOPRANO/TENOR)가 오른쪽 파트(ALTO/BASS)보다 오른쪽에 있으면 교환
  for (let row = 1; row <= rowCapacities.length; row++) {
    const rowSeats = seats.filter(s => s.row === row);
    const leftParts = rowSeats.filter(s => s.part === 'SOPRANO' || s.part === 'TENOR');
    const rightParts = rowSeats.filter(s => s.part === 'ALTO' || s.part === 'BASS');

    if (leftParts.length === 0 || rightParts.length === 0) continue;

    // 왼쪽 파트의 최대 열과 오른쪽 파트의 최소 열 찾기
    const maxLeftCol = Math.max(...leftParts.map(s => s.col));
    const minRightCol = Math.min(...rightParts.map(s => s.col));

    // 위반이 있으면 교환
    if (maxLeftCol > minRightCol) {
      // 위반하는 좌석들 찾기
      const violatingLeftSeats = leftParts.filter(s => s.col >= minRightCol).sort((a, b) => b.col - a.col);
      const violatingRightSeats = rightParts.filter(s => s.col <= maxLeftCol).sort((a, b) => a.col - b.col);

      // 교환 수행
      const swapCount = Math.min(violatingLeftSeats.length, violatingRightSeats.length);
      for (let i = 0; i < swapCount; i++) {
        const leftSeat = violatingLeftSeats[i];
        const rightSeat = violatingRightSeats[i];
        // 열 교환
        const tempCol = leftSeat.col;
        leftSeat.col = rightSeat.col;
        rightSeat.col = tempCol;
        logger.debug(`좌우 위반 수정: ${leftSeat.member_name}(${leftSeat.part}) ↔ ${rightSeat.member_name}(${rightSeat.part}) in row ${row}`);
      }
    }
  }

  // 좌석 정렬 (행 → 열 순)
  seats.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  return seats;
}

/**
 * AI 자동배치 옵션
 */
export interface ArrangementOptions {
  /** 대원별 이전 배치 이력 (고정석 패턴 계산용) */
  seatHistories?: SeatHistory[];
  /** 미리 계산된 선호 좌석 정보 */
  preferredSeats?: Map<string, PreferredSeat>;
}

/**
 * AI 자동배치 메인 함수
 *
 * 배치 프로세스:
 * 1. 파트별 인원 집계
 * 2. ML 기반 행 구성 추천
 * 3. 행별 파트 분배 계산 (좌우/상하 분할)
 * 4. 고정석 선호도 계산 (이력 제공 시)
 * 5. 대원 정렬 (고정석 우선)
 * 6. 좌석 배치
 *
 * @param attendingMembers 출석 대원 목록
 * @param options 배치 옵션 (고정석 이력 등)
 */
export function generateAISeatingArrangement(
  attendingMembers: Member[],
  options?: ArrangementOptions
): ArrangementResult {
  // 1. 멤버 수 및 파트별 분포 계산
  const totalMembers = attendingMembers.length;
  const partCounts: Record<string, number> = {
    SOPRANO: 0,
    ALTO: 0,
    TENOR: 0,
    BASS: 0,
  };

  attendingMembers.forEach(member => {
    partCounts[member.part]++;
  });

  // 2. ML 학습 데이터 기반 행 구성 추천 (ALTO 용량 조정 포함)
  const recommendation = recommendRowDistribution(totalMembers, partCounts);
  const rowCapacities = recommendation.rowCapacities;
  const numRows = recommendation.rows;

  // 3. 파트별 행 분배 계산 (좌우/상하 분할)
  //    - 1-3행: SOPRANO/ALTO 우선 (overflow 시 SOPRANO→4~5행 가장자리, ALTO→4행)
  //    - 4-6행: TENOR/BASS 우선 (중앙부터 채움, 1~3행 배치 없음)
  const distribution = distributePartsToRows(partCounts, rowCapacities);

  // 4. 고정석 선호도 계산 (이력이 제공된 경우)
  let preferredSeats = options?.preferredSeats;
  if (!preferredSeats && options?.seatHistories) {
    preferredSeats = calculatePreferredSeats(options.seatHistories);
  }

  // 5. 멤버 그룹화 및 정렬 (고정석 우선)
  const membersByPart = groupAndSortMembers(attendingMembers, preferredSeats);

  // 6. 행별로 좌석 배치 (고정석 우선, TENOR/BASS는 중앙부터)
  const seats = assignSeatsToRows(membersByPart, distribution, rowCapacities, preferredSeats);

  // === DEBUG: 파트별 배치 현황 로깅 ===
  const partSeats: Record<string, { row: number; col: number; name: string }[]> = {};
  for (const seat of seats) {
    const part = seat.part;
    if (!partSeats[part]) partSeats[part] = [];
    partSeats[part].push({ row: seat.row, col: seat.col, name: seat.member_name });
  }

  logger.debug('=== 파트별 배치 현황 ===');
  for (const part of ['SOPRANO', 'ALTO', 'TENOR', 'BASS']) {
    const ps = partSeats[part] || [];
    if (ps.length === 0) continue;

    const rowGroups: Record<number, number[]> = {};
    for (const s of ps) {
      if (!rowGroups[s.row]) rowGroups[s.row] = [];
      rowGroups[s.row].push(s.col);
    }

    logger.debug(`[${part}] 총 ${ps.length}명:`);
    for (const row of Object.keys(rowGroups).map(Number).sort((a, b) => a - b)) {
      const cols = rowGroups[row].sort((a, b) => a - b);
      const constraint = getAdjustedColConstraints(part, row, rowCapacities[row - 1]);
      const constraintStr = constraint ? `학습범위: ${constraint.min}-${constraint.max}` : '(학습데이터 없음)';
      logger.debug(`  ${row}행: col ${cols.join(', ')} [${constraintStr}]`);

      // 범위 이탈 체크
      if (constraint) {
        const outOfRange = cols.filter(c => c < constraint.min || c > constraint.max);
        if (outOfRange.length > 0) {
          logger.debug(`    ⚠️ 범위 이탈: col ${outOfRange.join(', ')}`);
        }
      }
    }
  }
  logger.debug('=== 배치 현황 끝 ===');

  // 7. 그리드 압축 - 빈좌석 제거
  // 각 행에서 실제로 사용된 최대 열 번호를 찾아 rowCapacities 조정
  const adjustedRowCapacities: number[] = [];
  for (let row = 1; row <= numRows; row++) {
    const seatsInRow = seats.filter(s => s.row === row);
    if (seatsInRow.length > 0) {
      // 해당 행에서 가장 오른쪽에 배치된 열 번호
      const maxCol = Math.max(...seatsInRow.map(s => s.col));
      adjustedRowCapacities.push(maxCol);
    } else {
      // 해당 행에 배치된 대원이 없으면 0
      adjustedRowCapacities.push(0);
    }
  }

  const totalSeatsBeforeAdjust = rowCapacities.reduce((a, b) => a + b, 0);
  const totalSeatsAfterAdjust = adjustedRowCapacities.reduce((a, b) => a + b, 0);
  logger.debug(`그리드 압축: ${totalSeatsBeforeAdjust}석 → ${totalSeatsAfterAdjust}석 (${totalSeatsBeforeAdjust - totalSeatsAfterAdjust}석 감소)`);

  // 8. 결과 반환
  return {
    grid_layout: {
      rows: numRows,
      row_capacities: adjustedRowCapacities,  // 압축된 용량
      zigzag_pattern: 'even',
    },
    seats,
    metadata: {
      total_members: totalMembers,
      breakdown: partCounts,
    },
  };
}

/**
 * 학습된 대원 선호 좌석 데이터 타입
 * (training_data/member_seat_preferences.json 또는 DB member_seat_statistics 테이블)
 */
export interface LearnedMemberPreference {
  member_id: string;
  member_name?: string;
  part?: string;
  preferred_row: number;
  preferred_col: number;
  row_consistency: number;  // 0-100
  col_consistency: number;  // 0-100
  is_fixed_seat: boolean;
  total_appearances: number;
}

/**
 * DB member_seat_statistics 테이블의 데이터 타입
 * (Supabase에서 직접 조회한 결과)
 */
export interface DBMemberSeatStatistics {
  id: string;
  member_id: string;
  preferred_row: number | null;
  preferred_col: number | null;
  row_consistency: number | null;
  col_consistency: number | null;
  is_fixed_seat: boolean;
  total_appearances: number;
  row_counts: Record<string, number> | null;
  col_sum: number | null;
  last_arrangement_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 학습된 선호 좌석 데이터를 PreferredSeat Map으로 변환
 * (JSON 파일 소스용)
 */
export function loadLearnedPreferences(
  preferences: LearnedMemberPreference[]
): Map<string, PreferredSeat> {
  const map = new Map<string, PreferredSeat>();

  for (const pref of preferences) {
    map.set(pref.member_id, {
      member_id: pref.member_id,
      preferred_row: pref.preferred_row,
      preferred_col: pref.preferred_col,
      row_consistency: pref.row_consistency / 100,  // 0-1로 변환
      col_consistency: pref.col_consistency / 100,  // 0-1로 변환
      total_appearances: pref.total_appearances,
    });
  }

  return map;
}

/**
 * DB에서 조회한 통계 데이터를 PreferredSeat Map으로 변환
 * (Supabase member_seat_statistics 테이블 소스용)
 */
export function loadPreferencesFromDB(
  dbStats: DBMemberSeatStatistics[]
): Map<string, PreferredSeat> {
  const map = new Map<string, PreferredSeat>();

  for (const stat of dbStats) {
    // null 값이 있는 경우 기본값 사용
    if (stat.preferred_row === null || stat.preferred_col === null) {
      continue;
    }

    map.set(stat.member_id, {
      member_id: stat.member_id,
      preferred_row: stat.preferred_row,
      preferred_col: stat.preferred_col,
      row_consistency: (stat.row_consistency ?? 0) / 100,  // 0-1로 변환
      col_consistency: (stat.col_consistency ?? 0) / 100,  // 0-1로 변환
      total_appearances: stat.total_appearances,
    });
  }

  return map;
}
