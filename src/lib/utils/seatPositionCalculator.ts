/**
 * Seat Position Calculator
 * 좌석 위치 계산 유틸리티
 */
import {
  GridLayout,
  RowOffsetValue,
  RowSeatPositions,
  SeatPosition,
  ZigzagPattern,
} from '@/types/grid';

/**
 * 행 인덱스에 따른 수평 오프셋 계산
 *
 * @param rowIndex 0-based 행 인덱스
 * @param pattern 지그재그 패턴
 * @param capacity 해당 행의 좌석 수
 * @param rowOffsets 행별 개별 오프셋 설정 (선택적)
 * @returns 오프셋 값 (0, 0.25, 0.5, 0.75 등)
 *
 * @example
 * getZigzagOffset(0, 'even', 16) // → 0 (1번째 줄)
 * getZigzagOffset(1, 'even', 16) // → 0.5 (2번째 줄, 짝수)
 * getZigzagOffset(2, 'even', 16, { 2: 0.25 }) // → 0.25 (3번째 줄, 개별 설정)
 */
export function getZigzagOffset(
  rowIndex: number,
  pattern: ZigzagPattern,
  capacity: number,
  rowOffsets?: Record<number, RowOffsetValue>
): number {
  // 행별 개별 오프셋이 설정되어 있고 null이 아니면 해당 값 사용
  if (rowOffsets && rowIndex in rowOffsets) {
    const customOffset = rowOffsets[rowIndex];
    if (customOffset !== null && customOffset !== undefined) {
      return customOffset;
    }
    // null이면 기본 패턴 따름 (아래 로직 진행)
  }

  // 기본 패턴 로직
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
export function calculateAllSeatPositions(gridLayout: GridLayout): SeatPosition[] {
  const positions: SeatPosition[] = [];

  gridLayout.rowCapacities.forEach((capacity, rowIndex) => {
    const offset = getZigzagOffset(
      rowIndex,
      gridLayout.zigzagPattern,
      capacity,
      gridLayout.rowOffsets
    );

    for (let colIndex = 0; colIndex < capacity; colIndex++) {
      positions.push({
        row: rowIndex + 1, // 1-based row index
        col: colIndex + 1, // 1-based column index
        visualCol: colIndex + offset,
      });
    }
  });

  return positions;
}

/**
 * 특정 논리적 좌표(row, col)의 화면상 위치 계산
 *
 * @param row 논리적 행 번호 (1-based)
 * @param col 논리적 열 번호 (1-based)
 * @param gridLayout 그리드 레이아웃
 * @returns 좌석 위치 정보 또는 null (범위를 벗어난 경우)
 */
export function calculateSeatPosition(
  row: number,
  col: number,
  gridLayout: GridLayout
): SeatPosition | null {
  // 1-based to 0-based for array access
  const rowIndex = row - 1;
  const colIndex = col - 1;

  // 범위 검사
  if (rowIndex < 0 || rowIndex >= gridLayout.rows) {
    return null;
  }

  if (colIndex < 0 || colIndex >= gridLayout.rowCapacities[rowIndex]) {
    return null;
  }

  const offset = getZigzagOffset(
    rowIndex,
    gridLayout.zigzagPattern,
    gridLayout.rowCapacities[rowIndex],
    gridLayout.rowOffsets
  );

  return {
    row, // Keep 1-based
    col, // Keep 1-based
    visualCol: colIndex + offset,
  };
}

/**
 * 행별로 그룹화된 좌석 위치 계산 (Flexbox 중앙 정렬용)
 * @param gridLayout - 그리드 레이아웃 설정
 * @returns 행별 좌석 위치 배열
 */
export function calculateSeatsByRow(gridLayout: GridLayout): RowSeatPositions[] {
  const rowsData: RowSeatPositions[] = [];

  // gridLayout 또는 rowCapacities가 없으면 빈 배열 반환
  if (!gridLayout?.rowCapacities) {
    return rowsData;
  }

  gridLayout.rowCapacities.forEach((capacity, rowIndex) => {
    const offset = getZigzagOffset(
      rowIndex,
      gridLayout.zigzagPattern,
      capacity,
      gridLayout.rowOffsets
    );
    const seats: SeatPosition[] = [];

    for (let colIndex = 0; colIndex < capacity; colIndex++) {
      seats.push({
        row: rowIndex + 1, // 1-based row index
        col: colIndex + 1, // 1-based column index
        visualCol: colIndex + offset,
      });
    }

    rowsData.push({
      rowIndex: rowIndex + 1, // 1-based row index for display
      seats,
      capacity,
      offset,
    });
  });

  return rowsData;
}
