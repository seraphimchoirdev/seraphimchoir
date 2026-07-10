/**
 * src/lib/notifications/seat-notification-utils.ts 순수 함수 테스트
 */
import {
  diffSeatChanges,
  findNeighbors,
  formatSeatDescription,
  type SeatInfo,
  type SeatPosition,
} from '../seat-notification-utils';

const seat = (memberId: string, memberName: string, row: number, column: number): SeatInfo => ({
  memberId,
  memberName,
  row,
  column,
});

// ─── findNeighbors ──────────────────────────────────────────────────

describe('findNeighbors', () => {
  const seats = [
    seat('a', '김소프', 1, 1),
    seat('b', '이알토', 1, 2),
    seat('c', '박테너', 1, 3),
    seat('d', '최베이스', 2, 2),
  ];

  it('좌우 모두 있는 좌석 -> left/right 반환', () => {
    const result = findNeighbors(seats, seats[1]); // 1행 2번
    expect(result.left?.memberName).toBe('김소프');
    expect(result.right?.memberName).toBe('박테너');
  });

  it('행 첫 좌석 -> left는 null', () => {
    const result = findNeighbors(seats, seats[0]); // 1행 1번
    expect(result.left).toBeNull();
    expect(result.right?.memberName).toBe('이알토');
  });

  it('다른 행 좌석은 옆자리로 치지 않는다', () => {
    const result = findNeighbors(seats, seats[3]); // 2행 2번 (1행 1·3번과 column 인접)
    expect(result.left).toBeNull();
    expect(result.right).toBeNull();
  });
});

// ─── formatSeatDescription ──────────────────────────────────────────

describe('formatSeatDescription', () => {
  const target = seat('a', '김소프', 3, 5);

  it('양옆 모두 있음 -> "사이" 문구', () => {
    const desc = formatSeatDescription(target, {
      left: seat('b', '이알토', 3, 4),
      right: seat('c', '박테너', 3, 6),
    });
    expect(desc).toBe('3열 5번 — 이알토 대원과 박테너 대원 사이');
  });

  it('한쪽만 있음 -> "옆" 문구', () => {
    const desc = formatSeatDescription(target, {
      left: null,
      right: seat('c', '박테너', 3, 6),
    });
    expect(desc).toBe('3열 5번 — 박테너 대원 옆');
  });

  it('양옆 없음 -> 위치만', () => {
    const desc = formatSeatDescription(target, { left: null, right: null });
    expect(desc).toBe('3열 5번');
  });
});

// ─── diffSeatChanges ────────────────────────────────────────────────

describe('diffSeatChanges', () => {
  const pos = (row: number, column: number): SeatPosition => ({ row, column });

  it('위치가 바뀐 대원만 감지한다', () => {
    const before = new Map([
      ['a', pos(1, 1)],
      ['b', pos(1, 2)],
    ]);
    const after = new Map([
      ['a', pos(1, 1)],
      ['b', pos(2, 3)],
    ]);
    expect(diffSeatChanges(before, after)).toEqual(new Set(['b']));
  });

  it('신규 배정된 대원을 감지한다', () => {
    const before = new Map([['a', pos(1, 1)]]);
    const after = new Map([
      ['a', pos(1, 1)],
      ['c', pos(2, 1)],
    ]);
    expect(diffSeatChanges(before, after)).toEqual(new Set(['c']));
  });

  it('배치에서 빠진 대원을 감지한다', () => {
    const before = new Map([
      ['a', pos(1, 1)],
      ['b', pos(1, 2)],
    ]);
    const after = new Map([['a', pos(1, 1)]]);
    expect(diffSeatChanges(before, after)).toEqual(new Set(['b']));
  });

  it('변동 없음 -> 빈 집합', () => {
    const before = new Map([['a', pos(1, 1)]]);
    const after = new Map([['a', pos(1, 1)]]);
    expect(diffSeatChanges(before, after).size).toBe(0);
  });
});
