/**
 * Seat Position Calculator
 * 좌석 위치 계산 유틸리티
 */

import { GridLayout, SeatPosition, ZigzagPattern, RowSeatPositions } from '@/types/grid';

/**
 * 행 인덱스에 따른 수평 오프셋 계산
 *
 * @param rowIndex 0-based 행 인덱스
 * @param pattern 지그재그 패턴
 * @returns 0 (오프셋 없음) 또는 0.5 (반 칸 오프셋)
 *
 * @example
 * getZigzagOffset(0, 'even') // → 0 (1번째 줄)
 * getZigzagOffset(1, 'even') // → 0.5 (2번째 줄, 짝수)
 * getZigzagOffset(2, 'even') // → 0 (3번째 줄)
 * getZigzagOffset(3, 'even') // → 0.5 (4번째 줄, 짝수)
 */
export function getZigzagOffset(
  rowIndex: number,
  pattern: ZigzagPattern,
  capacity: number
): number {
  if (pattern === 'none') return 0;

  // even 패턴: 짝수 행(0, 2...)이 Grid A(중앙 좌석), 홀수 행(1, 3...)이 Grid B(중앙 공백)
  // odd 패턴: 짝수 행(0, 2...)이 Grid B(중앙 공백), 홀수 행(1, 3...)이 Grid A(중앙 좌석)

  // Grid A (중앙 좌석)를 만들기 위한 조건:
  // - 홀수 인원(Odd Capacity): 오프셋 0
  // - 짝수 인원(Even Capacity): 오프셋 0.5

  // Grid B (중앙 공백)를 만들기 위한 조건:
  // - 홀수 인원(Odd Capacity): 오프셋 0.5
  // - 짝수 인원(Even Capacity): 오프셋 0

  const isEvenRow = rowIndex % 2 === 0;
  const isEvenCapacity = capacity % 2 === 0;

  // 목표가 Grid A인지 확인
  const targetIsGridA = (pattern === 'even' && isEvenRow) || (pattern === 'odd' && !isEvenRow);

  if (targetIsGridA) {
    return isEvenCapacity ? 0.5 : 0;
  } else {
    // Target is Grid B
    return isEvenCapacity ? 0 : 0.5;
  }
}

/**
 * 그리드 레이아웃에 따른 모든 좌석 위치 계산
 *
 * @param gridLayout 그리드 레이아웃
 * @returns 모든 좌석 위치 정보 배열
 */
export function calculateAllSeatPositions(
  gridLayout: GridLayout
): SeatPosition[] {
  const positions: SeatPosition[] = [];

  gridLayout.rowCapacities.forEach((capacity, rowIndex) => {
    const offset = getZigzagOffset(rowIndex, gridLayout.zigzagPattern, capacity);

    for (let colIndex = 0; colIndex < capacity; colIndex++) {
      positions.push({
        row: rowIndex,
        col: colIndex,
        visualCol: colIndex + offset,
      });
    }
  });

  return positions;
}

/**
 * 특정 논리적 좌표(row, col)의 화면상 위치 계산
 *
 * @param row 논리적 행 번호 (0-based)
 * @param col 논리적 열 번호 (0-based)
 * @param gridLayout 그리드 레이아웃
 * @returns 좌석 위치 정보 또는 null (범위를 벗어난 경우)
 */
export function calculateSeatPosition(
  row: number,
  col: number,
  gridLayout: GridLayout
): SeatPosition | null {
  // 범위 검사
  if (row < 0 || row >= gridLayout.rows) {
    return null;
  }

  if (col < 0 || col >= gridLayout.rowCapacities[row]) {
    return null;
  }

  const offset = getZigzagOffset(row, gridLayout.zigzagPattern, gridLayout.rowCapacities[row]);

  return {
    row,
    col,
    visualCol: col + offset,
  };
}

/**
 * 행별로 그룹화된 좌석 위치 계산 (Flexbox 중앙 정렬용)
 * @param gridLayout - 그리드 레이아웃 설정
 * @returns 행별 좌석 위치 배열
 */
export function calculateSeatsByRow(
  gridLayout: GridLayout
): RowSeatPositions[] {
  const rowsData: RowSeatPositions[] = [];

  gridLayout.rowCapacities.forEach((capacity, rowIndex) => {
    const offset = getZigzagOffset(rowIndex, gridLayout.zigzagPattern, capacity);
    const seats: SeatPosition[] = [];

    for (let colIndex = 0; colIndex < capacity; colIndex++) {
      seats.push({
        row: rowIndex,
        col: colIndex,
        visualCol: colIndex + offset,
      });
    }

    rowsData.push({
      rowIndex,
      seats,
      capacity,
      offset,
    });
  });

  return rowsData;
}
