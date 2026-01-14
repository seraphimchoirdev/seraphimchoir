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

  // 총 인원으로 좌우 비율 계산
  const leftTotal = sopranoRemaining + tenorRemaining;
  const rightTotal = altoRemaining + bassRemaining;
  const totalMembers = leftTotal + rightTotal;

  if (totalMembers === 0) return distribution;

  // === STEP 1: 4-6행에 TENOR/BASS 우선 배치 (개선됨) ===
  // 핵심 변경: overflow 공간 예약 없이 TENOR/BASS를 먼저 충분히 배치
  // 남는 공간에 나중에 overflow 배치
  const backRowCount = Math.max(1, numRows - 3); // 4-6행 개수

  // 4-6행 총 용량 계산 (MAX_ROW_CAPACITY 기준)
  let backRowTotalCapacity = 0;
  for (let row = 4; row <= numRows; row++) {
    backRowTotalCapacity += Math.min(MAX_ROW_CAPACITY, rowCapacities[row - 1] + 4); // 여유 공간 포함
  }

  // TENOR/BASS 총 인원
  const tenorBassTotal = tenorRemaining + bassRemaining;

  // 각 행에 TENOR/BASS를 균등하게 분배
  const tenorBassPerRow = Math.ceil(tenorBassTotal / backRowCount);

  for (let row = 4; row <= numRows; row++) {
    // 각 행에 배치할 TENOR/BASS 수 계산
    const rowCapacity = Math.min(MAX_ROW_CAPACITY, rowCapacities[row - 1] + 4);
    const tenorBassForThisRow = Math.min(tenorBassPerRow, tenorRemaining + bassRemaining, rowCapacity);

    // 좌우 비율로 TENOR/BASS 분배
    const tenorRatio = tenorRemaining / (tenorRemaining + bassRemaining || 1);
    const tenorForThisRow = Math.round(tenorBassForThisRow * tenorRatio);
    const bassForThisRow = tenorBassForThisRow - tenorForThisRow;

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

  // === STEP 2: 1-3행에 SOPRANO/ALTO 배치 ===
  for (let row = 1; row <= 3; row++) {
    const rowCapacity = rowCapacities[row - 1];
    const leftCapacity = Math.round(rowCapacity * leftTotal / totalMembers);
    const rightCapacity = rowCapacity - leftCapacity;

    // SOPRANO 배치 (왼쪽)
    const sopranoToPlace = Math.min(sopranoRemaining, leftCapacity);
    distribution[row].SOPRANO = sopranoToPlace;
    sopranoRemaining -= sopranoToPlace;
    rowTotals[row - 1] += sopranoToPlace;

    // ALTO 배치 (오른쪽)
    const altoToPlace = Math.min(altoRemaining, rightCapacity);
    distribution[row].ALTO = altoToPlace;
    altoRemaining -= altoToPlace;
    rowTotals[row - 1] += altoToPlace;
  }

  // === STEP 3: SOPRANO overflow → 4-6행 왼쪽 가장자리 ===
  // 역순 배치 (6→5→4): 5-6행은 ALTO가 금지되므로 SOPRANO로 먼저 채움
  // 이렇게 하면 row 6의 빈좌석이 SOPRANO overflow로 채워짐
  if (sopranoRemaining > 0) {
    for (let row = numRows; row >= 4; row--) {
      if (sopranoRemaining === 0) break;

      const rowCapacity = rowCapacities[row - 1];
      const availableSpace = rowCapacity - rowTotals[row - 1];

      if (availableSpace > 0) {
        // 왼쪽 가장자리에 추가 (TENOR 앞에)
        const toPlace = Math.min(sopranoRemaining, availableSpace);
        distribution[row].SOPRANO = toPlace;
        sopranoRemaining -= toPlace;
        rowTotals[row - 1] += toPlace;
      }
    }
  }

  // === STEP 4: ALTO overflow → 4행에만 배치 (5-6행 금지) ===
  // MAX_ROW_CAPACITY 기준으로 빈공간 계산
  if (altoRemaining > 0 && numRows >= 4) {
    const row = 4;
    const availableSpace = MAX_ROW_CAPACITY - rowTotals[row - 1];

    if (availableSpace > 0) {
      const toPlace = Math.min(altoRemaining, availableSpace);
      distribution[row].ALTO += toPlace;
      altoRemaining -= toPlace;
      rowTotals[row - 1] += toPlace;
    }
  }

  // === STEP 5: 남은 TENOR/BASS가 있으면 4-6행에 추가 배치 ===
  // TENOR/BASS는 4-6행에만 배치 (1-3행 금지 유지)
  // MAX_ROW_CAPACITY까지 확장하여 미배치 방지
  if (tenorRemaining > 0 || bassRemaining > 0) {
    for (let row = 4; row <= numRows; row++) {
      // MAX_ROW_CAPACITY 기준으로 빈공간 계산 (미배치 방지)
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
  // SOPRANO: 모든 행 가능, TENOR/BASS: 4-6행에만, ALTO: 4행 overflow만
  // MAX_ROW_CAPACITY 기준으로 빈공간 계산
  if (sopranoRemaining > 0) {
    for (let row = 1; row <= numRows; row++) {
      let availableSpace = MAX_ROW_CAPACITY - rowTotals[row - 1];

      if (sopranoRemaining > 0 && availableSpace > 0) {
        const toPlace = Math.min(sopranoRemaining, availableSpace);
        distribution[row].SOPRANO += toPlace;
        sopranoRemaining -= toPlace;
        rowTotals[row - 1] += toPlace;
      }
    }
  }

  // TENOR/BASS는 4-6행에만 배치 (MAX_ROW_CAPACITY 기준)
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

  // 알토 남은 인원 - 4행까지만 재시도 (1-3행 우선, 그다음 4행)
  // MAX_ROW_CAPACITY 기준으로 빈공간 계산
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
 * 행별로 좌석 배치
 *
 * 지휘자 중심 좌우 분할 배치:
 * - 왼쪽: SOPRANO, TENOR (왼쪽 파트끼리 모여 배치)
 * - 오른쪽: ALTO, BASS (오른쪽 파트끼리 모여 배치)
 *
 * 파트별 배치 방식:
 * - 1-3행 (SOPRANO/ALTO 주력):
 *   SOPRANO는 왼쪽 가장자리부터, ALTO는 오른쪽 가장자리부터
 *   TENOR/BASS overflow 시 중앙에 배치
 *
 * - 4-6행 (TENOR/BASS 주력):
 *   TENOR/BASS는 중앙부터 채움 (중앙에서 양쪽으로 확장)
 *   SOPRANO/ALTO overflow 시 가장자리에 배치
 *
 * 고정석 우선 배치:
 * - 고정석 성향이 강한 대원은 선호 행에 우선 배치
 * - 같은 행 내에서 선호 열 위치에 가깝게 배치
 *
 * 행별 배치 구조:
 * - 1-3행: [SOPRANO...가장자리→][←TENOR][ALTO→][←BASS...가장자리]
 * - 4-6행: [SOPRANO(가장자리)][TENOR←중앙→BASS][ALTO(가장자리)]
 */
function assignSeatsToRows(
  membersByPart: Record<string, Member[]>,
  distribution: Record<number, RowDistribution>,
  rowCapacities: number[],
  preferredSeats?: Map<string, PreferredSeat>
): Seat[] {
  const seats: Seat[] = [];
  const numRows = rowCapacities.length;

  // 고정석 대원을 선호 행에 우선 배치하기 위해 재정렬
  // 최적화: 사전 인덱싱으로 Map 조회 횟수 감소
  if (preferredSeats) {
    for (const part of ['SOPRANO', 'ALTO', 'TENOR', 'BASS'] as const) {
      const members = membersByPart[part];

      // 최적화: 대원별 선호 정보 사전 조회 (O(M) 조회 → 이후 O(1) 접근)
      const memberPrefs = new Map<string, PreferredSeat | undefined>();
      for (const member of members) {
        memberPrefs.set(member.id, preferredSeats.get(member.id));
      }

      // 선호 행별로 그룹화
      const byPreferredRow = new Map<number, Member[]>();
      const noPreference: Member[] = [];

      for (const member of members) {
        const pref = memberPrefs.get(member.id);
        if (pref && hasStrongFixedSeatPreference(pref)) {
          const rowMembers = byPreferredRow.get(pref.preferred_row) || [];
          rowMembers.push(member);
          byPreferredRow.set(pref.preferred_row, rowMembers);
        } else {
          noPreference.push(member);
        }
      }

      // 선호 행 순서대로 정렬 후 선호 없는 대원 추가
      const sortedMembers: Member[] = [];
      for (let row = 1; row <= numRows; row++) {
        const rowMembers = byPreferredRow.get(row) || [];
        // 같은 행 내에서 선호 열 순으로 정렬 (인덱싱된 Map 사용)
        rowMembers.sort((a, b) => {
          const prefA = memberPrefs.get(a.id);
          const prefB = memberPrefs.get(b.id);
          return (prefA?.preferred_col || 0) - (prefB?.preferred_col || 0);
        });
        sortedMembers.push(...rowMembers);
      }
      sortedMembers.push(...noPreference);

      membersByPart[part] = sortedMembers;
    }
  }

  for (let row = 1; row <= numRows; row++) {
    const rowCapacity = rowCapacities[row - 1];
    const sopranoCount = distribution[row].SOPRANO;
    const tenorCount = distribution[row].TENOR;
    const altoCount = distribution[row].ALTO;
    const bassCount = distribution[row].BASS;

    const isFrontRow = row <= 3;
    const totalInRow = sopranoCount + tenorCount + altoCount + bassCount;

    if (isFrontRow) {
      // === 1-3행: SOPRANO/ALTO가 주력, 가장자리부터 ===
      // 배치 순서: [SOPRANO(왼쪽)][TENOR][ALTO][BASS(오른쪽)]
      let col = 1;

      // SOPRANO 배치 (왼쪽 가장자리부터)
      for (let i = 0; i < sopranoCount; i++) {
        const member = membersByPart.SOPRANO.shift();
        if (member) {
          seats.push({
            member_id: member.id,
            member_name: member.name,
            part: member.part,
            row,
            col: col++,
          });
        }
      }

      // TENOR 배치 (SOPRANO 옆, 중앙 방향)
      for (let i = 0; i < tenorCount; i++) {
        const member = membersByPart.TENOR.shift();
        if (member) {
          seats.push({
            member_id: member.id,
            member_name: member.name,
            part: member.part,
            row,
            col: col++,
          });
        }
      }

      // ALTO 배치 (중앙에서 오른쪽으로)
      for (let i = 0; i < altoCount; i++) {
        const member = membersByPart.ALTO.shift();
        if (member) {
          seats.push({
            member_id: member.id,
            member_name: member.name,
            part: member.part,
            row,
            col: col++,
          });
        }
      }

      // BASS 배치 (오른쪽 끝)
      for (let i = 0; i < bassCount; i++) {
        const member = membersByPart.BASS.shift();
        if (member) {
          seats.push({
            member_id: member.id,
            member_name: member.name,
            part: member.part,
            row,
            col: col++,
          });
        }
      }
    } else {
      // === 4-6행: TENOR/BASS가 주력 ===
      // 배치 순서: [SOPRANO(왼쪽)][TENOR][BASS][ALTO(오른쪽)]
      // 1-3행과 동일하게 순차 배치 방식 사용 (col++ 사용)
      // 이렇게 하면 rowCapacity 초과 문제가 발생하지 않음
      let col = 1;

      // SOPRANO overflow 배치 (왼쪽 가장자리)
      for (let i = 0; i < sopranoCount; i++) {
        const member = membersByPart.SOPRANO.shift();
        if (member) {
          seats.push({
            member_id: member.id,
            member_name: member.name,
            part: member.part,
            row,
            col: col++,
          });
        }
      }

      // TENOR 배치 (SOPRANO 옆)
      for (let i = 0; i < tenorCount; i++) {
        const member = membersByPart.TENOR.shift();
        if (member) {
          seats.push({
            member_id: member.id,
            member_name: member.name,
            part: member.part,
            row,
            col: col++,
          });
        }
      }

      // BASS 배치 (TENOR 옆)
      for (let i = 0; i < bassCount; i++) {
        const member = membersByPart.BASS.shift();
        if (member) {
          seats.push({
            member_id: member.id,
            member_name: member.name,
            part: member.part,
            row,
            col: col++,
          });
        }
      }

      // ALTO overflow 배치 (오른쪽 가장자리)
      for (let i = 0; i < altoCount; i++) {
        const member = membersByPart.ALTO.shift();
        if (member) {
          seats.push({
            member_id: member.id,
            member_name: member.name,
            part: member.part,
            row,
            col: col++,
          });
        }
      }
    }
  }

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

  // 2. ML 학습 데이터 기반 행 구성 추천
  const recommendation = recommendRowDistribution(totalMembers);
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

  // 7. 결과 반환
  return {
    grid_layout: {
      rows: numRows,
      row_capacities: rowCapacities,
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
