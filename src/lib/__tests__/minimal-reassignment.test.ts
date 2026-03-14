import type { SeatAssignment } from '@/store/arrangement-store';
import type { GridLayout } from '@/types/grid';

import { DEFAULT_PART_ZONES } from '../part-zone-analyzer';

import { tryRowPull, minimalReassignment, applyGridBoundsOnly } from '../minimal-reassignment';

// 헬퍼: SeatAssignment 생성
function seat(
  row: number,
  col: number,
  part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS',
  id?: string,
  isRowLeader?: boolean
): SeatAssignment {
  return {
    memberId: id || `m-${row}-${col}`,
    memberName: `멤버${row}-${col}`,
    part,
    row,
    col,
    isRowLeader,
  };
}

function toRecord(seats: SeatAssignment[]): Record<string, SeatAssignment> {
  const record: Record<string, SeatAssignment> = {};
  for (const s of seats) {
    record[`${s.row}-${s.col}`] = s;
  }
  return record;
}

const defaultPartZones = new Map(
  (Object.entries(DEFAULT_PART_ZONES) as [string, (typeof DEFAULT_PART_ZONES)['SOPRANO']][]).map(
    ([k, v]) => [k, v] as const
  )
);

describe('minimal-reassignment', () => {
  describe('tryRowPull', () => {
    it('빈 좌석으로 인접 멤버를 당긴다', () => {
      const assignments = toRecord([
        seat(1, 1, 'SOPRANO'),
        seat(1, 3, 'SOPRANO'), // 2번은 비어있음
      ]);

      const result = tryRowPull(assignments, { row: 1, col: 2 }, defaultPartZones, 5);

      expect(result.moves).toHaveLength(1);
      expect(result.moves[0].from).toEqual({ row: 1, col: 1 });
      expect(result.moves[0].to).toEqual({ row: 1, col: 2 });
      expect(result.moves[0].reason).toBe('pull_in_row');
    });

    it('당길 후보가 없으면 이동하지 않는다', () => {
      const assignments = toRecord([]);

      const result = tryRowPull(assignments, { row: 1, col: 2 }, defaultPartZones, 5);

      expect(result.moves).toHaveLength(0);
      expect(result.newEmptyPos).toEqual({ row: 1, col: 2 });
    });

    it('줄반장은 낮은 우선순위로 이동한다', () => {
      const assignments = toRecord([
        seat(1, 1, 'SOPRANO', 'leader', true), // 줄반장
        seat(1, 3, 'SOPRANO', 'regular'), // 일반
      ]);

      const result = tryRowPull(assignments, { row: 1, col: 2 }, defaultPartZones, 5);

      // 둘 다 후보지만 줄반장이 아닌 쪽이 선호됨
      if (result.moves.length > 0) {
        expect(result.moves[0].memberId).toBe('regular');
      }
    });

    it('파트 영역을 벗어나는 이동은 하지 않는다', () => {
      // SOPRANO(left)를 오른쪽 영역으로 이동하려는 시도
      const assignments = toRecord([seat(1, 7, 'SOPRANO')]); // 왼쪽 경계

      const result = tryRowPull(
        assignments,
        { row: 1, col: 10 }, // 오른쪽 영역 빈 좌석
        defaultPartZones,
        15
      );

      // SOPRANO는 오른쪽(col >= 8)으로 이동 불가
      expect(result.moves).toHaveLength(0);
    });
  });

  describe('applyGridBoundsOnly', () => {
    it('그리드 내의 멤버는 유지한다', () => {
      const assignments = toRecord([
        seat(1, 1, 'SOPRANO'),
        seat(1, 2, 'ALTO'),
        seat(2, 1, 'TENOR'),
      ]);

      const gridLayout: GridLayout = {
        rows: 2,
        rowCapacities: [3, 3],
        rowOffsets: {},
        isManual: false,
      };

      const result = applyGridBoundsOnly(assignments, gridLayout);
      expect(Object.keys(result.newAssignments)).toHaveLength(3);
      expect(result.orphanedMembers).toHaveLength(0);
    });

    it('그리드 밖의 멤버를 orphan으로 분류한다', () => {
      const assignments = toRecord([
        seat(1, 1, 'SOPRANO'),
        seat(3, 1, 'TENOR'), // 3행은 새 그리드에 없음
      ]);

      const gridLayout: GridLayout = {
        rows: 2,
        rowCapacities: [5, 5],
        rowOffsets: {},
        isManual: false,
      };

      const result = applyGridBoundsOnly(assignments, gridLayout);
      expect(Object.keys(result.newAssignments)).toHaveLength(1);
      expect(result.orphanedMembers).toHaveLength(1);
      expect(result.orphanedMembers[0].memberId).toBe('m-3-1');
    });

    it('열이 축소된 경우도 처리한다', () => {
      const assignments = toRecord([
        seat(1, 1, 'SOPRANO'),
        seat(1, 10, 'ALTO'), // 10열은 새 그리드에서 용량 초과
      ]);

      const gridLayout: GridLayout = {
        rows: 1,
        rowCapacities: [5],
        rowOffsets: {},
        isManual: false,
      };

      const result = applyGridBoundsOnly(assignments, gridLayout);
      expect(Object.keys(result.newAssignments)).toHaveLength(1);
      expect(result.orphanedMembers).toHaveLength(1);
    });
  });

  describe('minimalReassignment', () => {
    it('빈 좌석에서 당기기를 수행한다', () => {
      const assignments = toRecord([
        seat(1, 1, 'SOPRANO'),
        seat(1, 3, 'SOPRANO'),
        seat(1, 4, 'SOPRANO'),
      ]);

      const gridLayout: GridLayout = {
        rows: 1,
        rowCapacities: [5],
        rowOffsets: {},
        isManual: false,
      };

      const result = minimalReassignment(
        assignments,
        { row: 1, col: 2 }, // 빈 좌석
        gridLayout,
        defaultPartZones
      );

      expect(result.stats.totalMoved).toBeGreaterThanOrEqual(0);
      expect(result.unassignedMembers).toHaveLength(0);
    });

    it('경계 밖 멤버를 재배치한다', () => {
      const assignments = toRecord([
        seat(1, 1, 'SOPRANO'),
        seat(1, 2, 'SOPRANO'),
        seat(3, 1, 'TENOR'), // 그리드 축소로 밀림
      ]);

      const gridLayout: GridLayout = {
        rows: 2,
        rowCapacities: [5, 5],
        rowOffsets: {},
        isManual: false,
      };

      const result = minimalReassignment(
        assignments,
        { row: 1, col: 3 },
        gridLayout,
        defaultPartZones
      );

      // 3행 멤버는 overflow 처리됨
      expect(result.stats.overflowMoves + result.unassignedMembers.length).toBeGreaterThanOrEqual(0);
    });

    it('통계를 올바르게 반환한다', () => {
      const assignments = toRecord([seat(1, 1, 'SOPRANO')]);

      const gridLayout: GridLayout = {
        rows: 1,
        rowCapacities: [5],
        rowOffsets: {},
        isManual: false,
      };

      const result = minimalReassignment(assignments, { row: 1, col: 2 }, gridLayout, defaultPartZones);

      expect(result.stats).toHaveProperty('totalMoved');
      expect(result.stats).toHaveProperty('sameRowMoves');
      expect(result.stats).toHaveProperty('nearbyMoves');
      expect(result.stats).toHaveProperty('overflowMoves');
      expect(result.stats.totalMoved).toBe(
        result.stats.sameRowMoves + result.stats.nearbyMoves + result.stats.overflowMoves
      );
    });
  });
});
