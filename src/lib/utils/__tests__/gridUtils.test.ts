/**
 * gridUtils 순수 함수 테스트
 *
 * 모킹 불필요 - GRID_CONSTRAINTS 상수와 GridLayout 타입만 참조
 */
import { GRID_CONSTRAINTS, type GridLayout } from '@/types/grid';

import {
  autoDistributeSeats,
  calculateGridLayoutFromSeats,
  calculateTotalSeats,
  getMaxRowCapacity,
  validateGridLayout,
} from '../gridUtils';

describe('autoDistributeSeats', () => {
  it('80명, 6줄 → 균등 분배 후 나머지 뒤쪽부터', () => {
    const result = autoDistributeSeats(80, 6);
    expect(result).toEqual([13, 13, 13, 13, 14, 14]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(80);
  });

  it('0명 → 모든 줄 0', () => {
    const result = autoDistributeSeats(0, 6);
    expect(result).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('줄 수보다 적은 인원 → 뒤쪽 줄에만 1명씩', () => {
    const result = autoDistributeSeats(3, 6);
    // base=0, remainder=3 → 뒤 3줄에 +1
    expect(result).toEqual([0, 0, 0, 1, 1, 1]);
  });

  it('나머지 없이 정확히 나누어 떨어지는 경우', () => {
    const result = autoDistributeSeats(18, 6);
    expect(result).toEqual([3, 3, 3, 3, 3, 3]);
  });

  it('음수 인원 → 모든 줄 0', () => {
    const result = autoDistributeSeats(-5, 4);
    expect(result).toEqual([0, 0, 0, 0]);
  });

  it('줄 수 0 → 빈 배열', () => {
    const result = autoDistributeSeats(10, 0);
    expect(result).toEqual([]);
  });
});

describe('validateGridLayout', () => {
  const validLayout: GridLayout = {
    rows: 6,
    rowCapacities: [13, 13, 13, 13, 14, 14],
    zigzagPattern: 'even',
  };

  it('유효한 레이아웃 → true', () => {
    expect(validateGridLayout(validLayout)).toBe(true);
  });

  it('행 수가 MIN_ROWS 미만 → false', () => {
    const layout: GridLayout = {
      rows: GRID_CONSTRAINTS.MIN_ROWS - 1,
      rowCapacities: Array(GRID_CONSTRAINTS.MIN_ROWS - 1).fill(10),
      zigzagPattern: 'none',
    };
    expect(validateGridLayout(layout)).toBe(false);
  });

  it('행 수가 MAX_ROWS 초과 → false', () => {
    const layout: GridLayout = {
      rows: GRID_CONSTRAINTS.MAX_ROWS + 1,
      rowCapacities: Array(GRID_CONSTRAINTS.MAX_ROWS + 1).fill(10),
      zigzagPattern: 'none',
    };
    expect(validateGridLayout(layout)).toBe(false);
  });

  it('rowCapacities 길이 불일치 → false', () => {
    const layout: GridLayout = {
      rows: 6,
      rowCapacities: [10, 10, 10], // 3개인데 rows=6
      zigzagPattern: 'none',
    };
    expect(validateGridLayout(layout)).toBe(false);
  });

  it('행 인원이 MAX_CAPACITY_PER_ROW 초과 → false', () => {
    const layout: GridLayout = {
      rows: 4,
      rowCapacities: [10, 10, GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW + 1, 10],
      zigzagPattern: 'none',
    };
    expect(validateGridLayout(layout)).toBe(false);
  });

  it('행 인원이 MIN_CAPACITY_PER_ROW 미만 → false', () => {
    const layout: GridLayout = {
      rows: 4,
      rowCapacities: [10, 10, GRID_CONSTRAINTS.MIN_CAPACITY_PER_ROW - 1, 10],
      zigzagPattern: 'none',
    };
    expect(validateGridLayout(layout)).toBe(false);
  });

  it('모든 행이 0명이어도 범위 내면 유효', () => {
    const layout: GridLayout = {
      rows: 4,
      rowCapacities: [0, 0, 0, 0],
      zigzagPattern: 'none',
    };
    expect(validateGridLayout(layout)).toBe(true);
  });
});

describe('calculateTotalSeats', () => {
  it('정상 합산', () => {
    const layout: GridLayout = {
      rows: 4,
      rowCapacities: [10, 12, 11, 13],
      zigzagPattern: 'none',
    };
    expect(calculateTotalSeats(layout)).toBe(46);
  });

  it('빈 rowCapacities → 0', () => {
    const layout: GridLayout = {
      rows: 0,
      rowCapacities: [],
      zigzagPattern: 'none',
    };
    expect(calculateTotalSeats(layout)).toBe(0);
  });
});

describe('getMaxRowCapacity', () => {
  it('최대값 반환', () => {
    const layout: GridLayout = {
      rows: 4,
      rowCapacities: [10, 15, 12, 8],
      zigzagPattern: 'none',
    };
    expect(getMaxRowCapacity(layout)).toBe(15);
  });

  it('빈 배열 → 0 (Math.max 폴백)', () => {
    const layout: GridLayout = {
      rows: 0,
      rowCapacities: [],
      zigzagPattern: 'none',
    };
    expect(getMaxRowCapacity(layout)).toBe(0);
  });

  it('모두 같은 값 → 해당 값', () => {
    const layout: GridLayout = {
      rows: 4,
      rowCapacities: [8, 8, 8, 8],
      zigzagPattern: 'none',
    };
    expect(getMaxRowCapacity(layout)).toBe(8);
  });
});

describe('calculateGridLayoutFromSeats', () => {
  it('좌석 데이터에서 레이아웃 계산', () => {
    const seats = [
      { seat_row: 1, seat_column: 1 },
      { seat_row: 1, seat_column: 2 },
      { seat_row: 2, seat_column: 1 },
    ];
    const result = calculateGridLayoutFromSeats(seats);

    expect(result.rows).toBe(2);
    expect(result.rowCapacities).toEqual([2, 1]);
    expect(result.zigzagPattern).toBe('even');
  });

  it('빈 배열 → 기본값 (DEFAULT_ROWS행, 각 8명)', () => {
    const result = calculateGridLayoutFromSeats([]);

    expect(result.rows).toBe(GRID_CONSTRAINTS.DEFAULT_ROWS);
    expect(result.rowCapacities).toHaveLength(GRID_CONSTRAINTS.DEFAULT_ROWS);
    expect(result.rowCapacities.every((c) => c === 8)).toBe(true);
  });

  it('null/undefined → 기본값', () => {
    const result = calculateGridLayoutFromSeats(null as unknown as Array<{ seat_row: number; seat_column: number }>);

    expect(result.rows).toBe(GRID_CONSTRAINTS.DEFAULT_ROWS);
  });

  it('중간 행이 비어있으면 0으로 처리', () => {
    // 1행과 3행만 있고 2행이 없는 경우
    const seats = [
      { seat_row: 1, seat_column: 3 },
      { seat_row: 3, seat_column: 2 },
    ];
    const result = calculateGridLayoutFromSeats(seats);

    expect(result.rows).toBe(3);
    expect(result.rowCapacities).toEqual([3, 0, 2]);
  });
});
