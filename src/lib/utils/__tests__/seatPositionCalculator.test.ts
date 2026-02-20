/**
 * seatPositionCalculator 순수 함수 테스트
 *
 * 좌석 위치 계산 유틸리티 - 지그재그 오프셋 로직이 핵심
 */
import type { GridLayout } from '@/types/grid';

import {
  calculateAllSeatPositions,
  calculateSeatPosition,
  calculateSeatsByRow,
  getZigzagOffset,
} from '../seatPositionCalculator';

describe('getZigzagOffset', () => {
  it('pattern=none → 항상 0', () => {
    expect(getZigzagOffset(0, 'none', 16)).toBe(0);
    expect(getZigzagOffset(1, 'none', 16)).toBe(0);
    expect(getZigzagOffset(5, 'none', 13)).toBe(0);
  });

  describe('even 패턴', () => {
    // even: 짝수행(0,2,4) = Grid A, 홀수행(1,3,5) = Grid B

    it('짝수행(Grid A), 짝수 인원 → 0.5', () => {
      // rowIndex=0 (짝수행), capacity=16 (짝수) → Grid A + even capacity = 0.5
      expect(getZigzagOffset(0, 'even', 16)).toBe(0.5);
    });

    it('짝수행(Grid A), 홀수 인원 → 0', () => {
      // rowIndex=0 (짝수행), capacity=15 (홀수) → Grid A + odd capacity = 0
      expect(getZigzagOffset(0, 'even', 15)).toBe(0);
    });

    it('홀수행(Grid B), 짝수 인원 → 0', () => {
      // rowIndex=1 (홀수행), capacity=16 (짝수) → Grid B + even capacity = 0
      expect(getZigzagOffset(1, 'even', 16)).toBe(0);
    });

    it('홀수행(Grid B), 홀수 인원 → 0.5', () => {
      // rowIndex=1 (홀수행), capacity=15 (홀수) → Grid B + odd capacity = 0.5
      expect(getZigzagOffset(1, 'even', 15)).toBe(0.5);
    });
  });

  describe('odd 패턴', () => {
    // odd: 짝수행(0,2,4) = Grid B, 홀수행(1,3,5) = Grid A

    it('홀수행(Grid A), 짝수 인원 → 0.5', () => {
      expect(getZigzagOffset(1, 'odd', 16)).toBe(0.5);
    });

    it('홀수행(Grid A), 홀수 인원 → 0', () => {
      expect(getZigzagOffset(1, 'odd', 15)).toBe(0);
    });

    it('짝수행(Grid B), 짝수 인원 → 0', () => {
      expect(getZigzagOffset(0, 'odd', 16)).toBe(0);
    });

    it('짝수행(Grid B), 홀수 인원 → 0.5', () => {
      expect(getZigzagOffset(0, 'odd', 15)).toBe(0.5);
    });
  });

  describe('rowOffsets 개별 설정', () => {
    it('개별 오프셋 값이 기본 패턴보다 우선', () => {
      // 기본 패턴으로는 0.5가 나와야 하지만, rowOffsets에 0.25 지정
      expect(getZigzagOffset(0, 'even', 16, { 0: 0.25 })).toBe(0.25);
    });

    it('개별 오프셋이 null이면 기본 패턴 따름', () => {
      expect(getZigzagOffset(0, 'even', 16, { 0: null })).toBe(0.5);
    });

    it('해당 행의 개별 오프셋이 없으면 기본 패턴', () => {
      // rowIndex=0에 대한 설정 없이 rowIndex=1만 설정
      expect(getZigzagOffset(0, 'even', 16, { 1: 0.75 })).toBe(0.5);
    });

    it('오프셋 0 설정 가능', () => {
      expect(getZigzagOffset(0, 'even', 16, { 0: 0 })).toBe(0);
    });
  });
});

describe('calculateAllSeatPositions', () => {
  it('기본 3행 레이아웃 → 올바른 position 배열', () => {
    const layout: GridLayout = {
      rows: 3,
      rowCapacities: [2, 3, 2],
      zigzagPattern: 'none',
    };

    const positions = calculateAllSeatPositions(layout);

    expect(positions).toHaveLength(7); // 2+3+2
    // 1행 (row=1)
    expect(positions[0]).toEqual({ row: 1, col: 1, visualCol: 0 });
    expect(positions[1]).toEqual({ row: 1, col: 2, visualCol: 1 });
    // 2행 (row=2)
    expect(positions[2]).toEqual({ row: 2, col: 1, visualCol: 0 });
    expect(positions[4]).toEqual({ row: 2, col: 3, visualCol: 2 });
    // 3행 (row=3)
    expect(positions[5]).toEqual({ row: 3, col: 1, visualCol: 0 });
  });

  it('지그재그 패턴 적용 확인', () => {
    const layout: GridLayout = {
      rows: 2,
      rowCapacities: [4, 4], // 짝수 인원
      zigzagPattern: 'even',
    };

    const positions = calculateAllSeatPositions(layout);
    // row 0 (짝수행, Grid A, 짝수인원) → offset=0.5
    expect(positions[0].visualCol).toBe(0.5); // colIndex(0) + offset(0.5)
    // row 1 (홀수행, Grid B, 짝수인원) → offset=0
    expect(positions[4].visualCol).toBe(0); // colIndex(0) + offset(0)
  });
});

describe('calculateSeatPosition', () => {
  const layout: GridLayout = {
    rows: 3,
    rowCapacities: [5, 4, 6],
    zigzagPattern: 'none',
  };

  it('유효 좌표 → SeatPosition 반환', () => {
    const pos = calculateSeatPosition(1, 3, layout);
    expect(pos).toEqual({ row: 1, col: 3, visualCol: 2 }); // colIndex=2, offset=0
  });

  it('행 범위 벗어남 → null', () => {
    expect(calculateSeatPosition(0, 1, layout)).toBeNull();
    expect(calculateSeatPosition(4, 1, layout)).toBeNull();
  });

  it('열 범위 벗어남 → null', () => {
    // row 2의 capacity는 4, col 5는 범위 밖
    expect(calculateSeatPosition(2, 5, layout)).toBeNull();
    expect(calculateSeatPosition(1, 0, layout)).toBeNull();
  });

  it('지그재그 패턴에서 visualCol 계산', () => {
    const zigzagLayout: GridLayout = {
      rows: 2,
      rowCapacities: [4, 4],
      zigzagPattern: 'even',
    };
    const pos = calculateSeatPosition(1, 2, zigzagLayout);
    // row=1 → rowIndex=0, 짝수행, Grid A, 짝수인원 → offset=0.5
    expect(pos?.visualCol).toBe(1.5); // colIndex(1) + offset(0.5)
  });
});

describe('calculateSeatsByRow', () => {
  it('행별 그룹화 확인', () => {
    const layout: GridLayout = {
      rows: 3,
      rowCapacities: [2, 3, 1],
      zigzagPattern: 'none',
    };

    const rows = calculateSeatsByRow(layout);

    expect(rows).toHaveLength(3);
    expect(rows[0].rowIndex).toBe(1);
    expect(rows[0].capacity).toBe(2);
    expect(rows[0].seats).toHaveLength(2);
    expect(rows[1].capacity).toBe(3);
    expect(rows[1].seats).toHaveLength(3);
    expect(rows[2].capacity).toBe(1);
  });

  it('rowCapacities 없음 → 빈 배열', () => {
    const result = calculateSeatsByRow(null as unknown as GridLayout);
    expect(result).toEqual([]);
  });

  it('offset 값이 정확히 전달됨', () => {
    const layout: GridLayout = {
      rows: 2,
      rowCapacities: [4, 4],
      zigzagPattern: 'even',
    };

    const rows = calculateSeatsByRow(layout);
    // row 0 → offset 0.5 (even, 짝수행, 짝수인원)
    expect(rows[0].offset).toBe(0.5);
    // row 1 → offset 0 (even, 홀수행, 짝수인원)
    expect(rows[1].offset).toBe(0);
  });
});
