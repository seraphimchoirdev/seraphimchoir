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

// ─── planSeatChangeDelivery (좌석 변동 알림 중복 억제) ─────────────────

import { planSeatChangeDelivery, type RecentNotificationRow } from '../seat-notification-utils';

const row = (
  id: string,
  userId: string,
  type: string,
  createdAt: string
): RecentNotificationRow => ({ id, user_id: userId, type, created_at: createdAt });

describe('planSeatChangeDelivery', () => {
  it('최근 알림이 없으면 전부 신규 발송', () => {
    const plan = planSeatChangeDelivery([{ userId: 'u1', body: '새 자리: 1열 1번' }], []);
    expect(plan.inserts).toHaveLength(1);
    expect(plan.updates).toHaveLength(0);
  });

  it('미읽음 SEAT_CHANGED가 있으면 갱신하고 created_at을 올린다 (B)', () => {
    const plan = planSeatChangeDelivery(
      [{ userId: 'u1', body: '새 자리: 2열 3번' }],
      [row('n1', 'u1', 'SEAT_CHANGED', '2026-07-18T01:00:00Z')]
    );
    expect(plan.inserts).toHaveLength(0);
    expect(plan.updates).toEqual([{ id: 'n1', body: '새 자리: 2열 3번', bumpCreatedAt: true }]);
  });

  it('미읽음 공유/확정 알림만 있으면 그 알림의 자리 안내를 갱신 (C, created_at 유지)', () => {
    const plan = planSeatChangeDelivery(
      [{ userId: 'u1', body: '새 자리: 2열 3번' }],
      [row('n2', 'u1', 'ARRANGEMENT_SHARED', '2026-07-18T01:00:00Z')]
    );
    expect(plan.inserts).toHaveLength(0);
    expect(plan.updates).toEqual([{ id: 'n2', body: '새 자리: 2열 3번', bumpCreatedAt: false }]);
  });

  it('SEAT_CHANGED와 공유 알림이 모두 있으면 SEAT_CHANGED를 우선 갱신', () => {
    const plan = planSeatChangeDelivery(
      [{ userId: 'u1', body: 'B' }],
      [
        row('shared', 'u1', 'ARRANGEMENT_SHARED', '2026-07-18T01:00:00Z'),
        row('seat', 'u1', 'SEAT_CHANGED', '2026-07-18T01:05:00Z'),
      ]
    );
    expect(plan.updates).toEqual([{ id: 'seat', body: 'B', bumpCreatedAt: true }]);
  });

  it('같은 타입이 여러 건이면 가장 최근 것을 갱신', () => {
    const plan = planSeatChangeDelivery(
      [{ userId: 'u1', body: 'B' }],
      [
        row('old', 'u1', 'SEAT_CHANGED', '2026-07-18T01:00:00Z'),
        row('new', 'u1', 'SEAT_CHANGED', '2026-07-18T01:10:00Z'),
      ]
    );
    expect(plan.updates[0].id).toBe('new');
  });

  it('사용자별로 독립적으로 판단한다', () => {
    const plan = planSeatChangeDelivery(
      [
        { userId: 'u1', body: 'B1' },
        { userId: 'u2', body: 'B2' },
      ],
      [row('n1', 'u1', 'SEAT_CHANGED', '2026-07-18T01:00:00Z')]
    );
    expect(plan.updates).toHaveLength(1);
    expect(plan.inserts).toEqual([{ userId: 'u2', body: 'B2' }]);
  });

  it('무관한 타입(VOTE_REMINDER 등)은 무시한다', () => {
    const plan = planSeatChangeDelivery(
      [{ userId: 'u1', body: 'B' }],
      [row('n1', 'u1', 'VOTE_REMINDER', '2026-07-18T01:00:00Z')]
    );
    expect(plan.inserts).toHaveLength(1);
    expect(plan.updates).toHaveLength(0);
  });
});
