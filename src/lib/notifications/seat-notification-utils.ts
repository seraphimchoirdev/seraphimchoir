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


// ─── 좌석 변동 알림 중복 억제 (디바운스) ─────────────────────────────

/** 같은 배치표에 대한 변동 알림을 새로 만들지 않고 갱신하는 시간 창 (분) */
export const SEAT_CHANGE_DEDUPE_WINDOW_MINUTES = 30;

/** 중복 억제 판단에 필요한 최근 알림 행 (미읽음만 조회해서 전달) */
export interface RecentNotificationRow {
  id: string;
  user_id: string;
  type: string;
  created_at: string;
}

export interface SeatChangeCandidate {
  userId: string;
  body: string;
}

export interface SeatChangeDeliveryPlan {
  /** 신규 발송 대상 (알림함 INSERT + 푸시) */
  inserts: SeatChangeCandidate[];
  /** 기존 알림 갱신 대상 (푸시 없음) */
  updates: {
    id: string;
    body: string;
    /** SEAT_CHANGED 갱신 시 목록 상단 정렬을 위해 created_at도 갱신 */
    bumpCreatedAt: boolean;
  }[];
}

/**
 * 좌석 변동 알림 발송 계획 수립 (순수 함수)
 *
 * 긴급 수정에서 저장할 때마다 알림이 발송되어 짧은 시간에 같은 대원에게
 * 여러 건이 쌓이는 문제(재배치 알림 디바운스)의 해결 로직:
 * - 시간 창 내 미읽음 SEAT_CHANGED가 있으면 → 그 알림을 최신 자리로 갱신 (B)
 * - 없고, 미읽음 공유/확정 알림이 있으면 → 그 알림의 자리 안내만 갱신 (C)
 *   (공유 알림에 이미 자리가 안내되므로 별도 변동 알림을 만들지 않음)
 * - 둘 다 없으면 → 신규 발송 (푸시 포함)
 *
 * 읽은 알림은 갱신하지 않는다 — 이미 이전 자리를 확인한 사용자에게는
 * 변동 사실을 새 알림으로 다시 알려야 하기 때문.
 * recentRows는 호출부에서 (미읽음 + 같은 배치표 link + 시간 창) 조건으로 조회해 전달한다.
 */
export function planSeatChangeDelivery(
  candidates: SeatChangeCandidate[],
  recentRows: RecentNotificationRow[]
): SeatChangeDeliveryPlan {
  // 사용자별 최신 행 선별
  const latestSeatChanged = new Map<string, RecentNotificationRow>();
  const latestStatus = new Map<string, RecentNotificationRow>();

  for (const row of recentRows) {
    const target =
      row.type === 'SEAT_CHANGED'
        ? latestSeatChanged
        : row.type === 'ARRANGEMENT_SHARED' || row.type === 'ARRANGEMENT_CONFIRMED'
          ? latestStatus
          : null;
    if (!target) continue;
    const prev = target.get(row.user_id);
    if (!prev || row.created_at > prev.created_at) {
      target.set(row.user_id, row);
    }
  }

  const plan: SeatChangeDeliveryPlan = { inserts: [], updates: [] };

  for (const candidate of candidates) {
    const seatRow = latestSeatChanged.get(candidate.userId);
    if (seatRow) {
      plan.updates.push({ id: seatRow.id, body: candidate.body, bumpCreatedAt: true });
      continue;
    }
    const statusRow = latestStatus.get(candidate.userId);
    if (statusRow) {
      // 공유/확정 알림의 자리 안내를 최신으로 교체 (발송 시각은 원본 유지)
      plan.updates.push({ id: statusRow.id, body: candidate.body, bumpCreatedAt: false });
      continue;
    }
    plan.inserts.push(candidate);
  }

  return plan;
}
