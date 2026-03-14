import type { SeatAssignment } from '@/store/arrangement-store';

import {
  detectPartBoundary,
  collectPartPositions,
  findRowsWithPart,
  selectRowLeaders,
} from '../row-leader-utils';

// SeatAssignment 생성 헬퍼
function seat(
  row: number,
  col: number,
  part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL',
  id?: string
): SeatAssignment {
  return {
    memberId: id || `m-${row}-${col}`,
    memberName: `멤버${row}-${col}`,
    part,
    row,
    col,
  };
}

function toRecord(seats: SeatAssignment[]): Record<string, SeatAssignment> {
  const record: Record<string, SeatAssignment> = {};
  for (const s of seats) {
    record[`${s.row}-${s.col}`] = s;
  }
  return record;
}

describe('row-leader-utils', () => {
  describe('detectPartBoundary', () => {
    it('왼쪽/오른쪽 파트 경계를 감지한다', () => {
      const assignments = toRecord([
        seat(1, 1, 'SOPRANO'),
        seat(1, 2, 'SOPRANO'),
        seat(1, 3, 'SOPRANO'),
        seat(1, 4, 'ALTO'),
        seat(1, 5, 'ALTO'),
      ]);

      const boundary = detectPartBoundary(assignments, 1, 5);
      expect(boundary.leftPartLastCol).toBe(3);
      expect(boundary.rightPartFirstCol).toBe(4);
    });

    it('왼쪽 파트만 있으면 오른쪽은 null', () => {
      const assignments = toRecord([
        seat(1, 1, 'SOPRANO'),
        seat(1, 2, 'SOPRANO'),
      ]);

      const boundary = detectPartBoundary(assignments, 1, 2);
      expect(boundary.leftPartLastCol).toBe(2);
      expect(boundary.rightPartFirstCol).toBeNull();
    });

    it('오른쪽 파트만 있으면 왼쪽은 null', () => {
      const assignments = toRecord([
        seat(1, 1, 'ALTO'),
        seat(1, 2, 'BASS'),
      ]);

      const boundary = detectPartBoundary(assignments, 1, 2);
      expect(boundary.leftPartLastCol).toBeNull();
      expect(boundary.rightPartFirstCol).toBe(1);
    });

    it('빈 행이면 둘 다 null', () => {
      const boundary = detectPartBoundary({}, 1, 5);
      expect(boundary.leftPartLastCol).toBeNull();
      expect(boundary.rightPartFirstCol).toBeNull();
    });
  });

  describe('collectPartPositions', () => {
    it('지정된 행에서 특정 파트의 위치를 수집한다', () => {
      const assignments = toRecord([
        seat(1, 1, 'SOPRANO'),
        seat(1, 2, 'SOPRANO'),
        seat(1, 3, 'ALTO'),
        seat(2, 1, 'SOPRANO'),
        seat(2, 2, 'ALTO'),
      ]);

      const positions = collectPartPositions(assignments, 'SOPRANO', [1, 2], [3, 2]);
      expect(positions).toEqual([
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
      ]);
    });

    it('범위 밖 행은 무시한다', () => {
      const assignments = toRecord([seat(1, 1, 'SOPRANO')]);
      const positions = collectPartPositions(assignments, 'SOPRANO', [1, 10], [3]);
      expect(positions).toHaveLength(1);
    });

    it('해당 파트가 없으면 빈 배열을 반환한다', () => {
      const assignments = toRecord([seat(1, 1, 'ALTO')]);
      const positions = collectPartPositions(assignments, 'SOPRANO', [1], [3]);
      expect(positions).toEqual([]);
    });
  });

  describe('findRowsWithPart', () => {
    it('특정 파트가 있는 행 번호를 반환한다', () => {
      const assignments = toRecord([
        seat(1, 1, 'SOPRANO'),
        seat(2, 1, 'ALTO'),
        seat(3, 1, 'SOPRANO'),
      ]);

      const rows = findRowsWithPart(assignments, 'SOPRANO', [3, 3, 3]);
      expect(rows).toEqual([1, 3]);
    });

    it('파트가 없으면 빈 배열을 반환한다', () => {
      const assignments = toRecord([seat(1, 1, 'ALTO')]);
      const rows = findRowsWithPart(assignments, 'TENOR', [3]);
      expect(rows).toEqual([]);
    });
  });

  describe('selectRowLeaders', () => {
    it('6행 배치에서 줄반장 후보를 선정한다', () => {
      // 전형적인 6행 배치 시뮬레이션
      const seats: SeatAssignment[] = [];

      // 1-3행: 소프라노(왼쪽) + 알토(오른쪽)
      for (let row = 1; row <= 3; row++) {
        for (let col = 1; col <= 7; col++) {
          seats.push(seat(row, col, 'SOPRANO'));
        }
        for (let col = 8; col <= 15; col++) {
          seats.push(seat(row, col, 'ALTO'));
        }
      }

      // 4-6행: 테너(왼쪽) + 베이스(오른쪽)
      for (let row = 4; row <= 6; row++) {
        for (let col = 1; col <= 7; col++) {
          seats.push(seat(row, col, 'TENOR'));
        }
        for (let col = 8; col <= 15; col++) {
          seats.push(seat(row, col, 'BASS'));
        }
      }

      const assignments = toRecord(seats);
      const gridLayout = {
        rows: 6,
        rowCapacities: [15, 15, 15, 15, 15, 15],
        rowOffsets: {},
        isManual: false,
      };

      const candidates = selectRowLeaders(assignments, gridLayout);

      // 줄반장 후보가 존재해야 함
      expect(candidates.length).toBeGreaterThan(0);
      // 최대 8명
      expect(candidates.length).toBeLessThanOrEqual(8);

      // 중복 없어야 함
      const keys = candidates.map((c) => `${c.row}-${c.col}`);
      expect(new Set(keys).size).toBe(keys.length);

      // 왼쪽/오른쪽 모두 포함
      expect(candidates.some((c) => c.side === 'left')).toBe(true);
      expect(candidates.some((c) => c.side === 'right')).toBe(true);
    });

    it('행 수가 적어도 에러 없이 동작한다', () => {
      const assignments = toRecord([
        seat(1, 1, 'SOPRANO'),
        seat(1, 2, 'ALTO'),
      ]);

      const gridLayout = {
        rows: 1,
        rowCapacities: [2],
        rowOffsets: {},
        isManual: false,
      };

      const candidates = selectRowLeaders(assignments, gridLayout);
      expect(Array.isArray(candidates)).toBe(true);
    });

    it('빈 배치에서도 에러 없이 동작한다', () => {
      const gridLayout = {
        rows: 6,
        rowCapacities: [15, 15, 15, 15, 15, 15],
        rowOffsets: {},
        isManual: false,
      };

      const candidates = selectRowLeaders({}, gridLayout);
      expect(candidates).toEqual([]);
    });
  });
});
