/**
 * 자리배치 알림용 순수 유틸 함수
 *
 * - 옆자리 판정은 "같은 행에서 seat_column ±1" 규칙을 사용한다.
 *   지그재그 배치에서 물리적 '옆'과 완전히 일치하지 않을 수 있으나(알려진 한계),
 *   행 내 좌석 번호가 연속이므로 실용적으로 충분하다.
 * - 클라이언트/서버 공용 가능하도록 DB 의존 없음.
 */

export interface SeatInfo {
  memberId: string;
  memberName: string;
  row: number;
  column: number;
}

export interface NeighborResult {
  left: SeatInfo | null;
  right: SeatInfo | null;
}

export interface SeatPosition {
  row: number;
  column: number;
}

/** 같은 행에서 좌우(column ±1) 옆자리 대원 탐색 */
export function findNeighbors(seats: SeatInfo[], target: SeatInfo): NeighborResult {
  const sameRow = seats.filter(
    (s) => s.row === target.row && s.memberId !== target.memberId
  );
  return {
    left: sameRow.find((s) => s.column === target.column - 1) ?? null,
    right: sameRow.find((s) => s.column === target.column + 1) ?? null,
  };
}

/** 본인 자리 안내 문구 생성 (예: "3열 5번 — 김OO 대원과 이OO 대원 사이") */
export function formatSeatDescription(target: SeatInfo, neighbors: NeighborResult): string {
  const position = `${target.row}열 ${target.column}번`;
  const names = [neighbors.left?.memberName, neighbors.right?.memberName].filter(
    (name): name is string => !!name
  );

  if (names.length === 0) return position;
  if (names.length === 1) return `${position} — ${names[0]} 대원 옆`;
  return `${position} — ${names[0]} 대원과 ${names[1]} 대원 사이`;
}

/**
 * 좌석 저장 전/후 스냅샷을 비교해 자리가 달라진 대원 집합을 반환.
 * 포함: 위치 이동, 신규 배정. (배치에서 빠진 대원도 포함 — 본인 자리가 사라진 것도 변동)
 */
export function diffSeatChanges(
  before: Map<string, SeatPosition>,
  after: Map<string, SeatPosition>
): Set<string> {
  const changed = new Set<string>();

  for (const [memberId, prev] of before) {
    const next = after.get(memberId);
    if (!next || next.row !== prev.row || next.column !== prev.column) {
      changed.add(memberId);
    }
  }
  for (const memberId of after.keys()) {
    if (!before.has(memberId)) {
      changed.add(memberId);
    }
  }

  return changed;
}
