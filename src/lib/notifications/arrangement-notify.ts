import 'server-only';

import { formatDisplayDate } from '@/lib/dashboard-context';
import { createLogger } from '@/lib/logger';
import { getApprovedUserIdsByMember } from '@/lib/notifications/audience';
import { notifyBatch, type NotifyEntry, type NotificationType } from '@/lib/notifications/notify';
import {
  findNeighbors,
  formatSeatDescription,
  type SeatInfo,
} from '@/lib/notifications/seat-notification-utils';
import { createAdminClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'ArrangementNotify' });

async function getArrangementSeats(arrangementId: string): Promise<SeatInfo[]> {
  const admin = await createAdminClient();

  const { data: seats, error } = await admin
    .from('seats')
    .select('member_id, seat_row, seat_column, members(name)')
    .eq('arrangement_id', arrangementId);

  if (error) {
    logger.warn('seats 조회 실패:', error.message);
    return [];
  }

  return (seats ?? [])
    .filter((s) => !!s.member_id)
    .map((s) => {
      // Supabase 조인 결과가 객체/배열 어느 쪽으로 추론되어도 처리
      const member = Array.isArray(s.members) ? s.members[0] : s.members;
      return {
        memberId: s.member_id as string,
        memberName: (member as { name?: string } | null)?.name ?? '',
        row: s.seat_row,
        column: s.seat_column,
      };
    });
}

/**
 * 배치표 공유(SHARED)/확정(CONFIRMED) 시 좌석이 있는 대원 전원에게
 * 본인 자리 위치(옆자리 대원 포함)를 개인화하여 알림
 */
export async function notifyArrangementStatusChange(
  arrangementId: string,
  status: 'SHARED' | 'CONFIRMED',
  arrangementDate: string
): Promise<void> {
  const seats = await getArrangementSeats(arrangementId);
  if (seats.length === 0) return;

  const userMap = await getApprovedUserIdsByMember(seats.map((s) => s.memberId));
  if (userMap.size === 0) return;

  const displayDate = formatDisplayDate(arrangementDate);
  const type: NotificationType =
    status === 'SHARED' ? 'ARRANGEMENT_SHARED' : 'ARRANGEMENT_CONFIRMED';
  const title =
    status === 'SHARED'
      ? `${displayDate} 자리배치표가 공유되었습니다`
      : `${displayDate} 자리배치표가 최종 확정되었습니다`;

  const entries: NotifyEntry[] = [];
  for (const seat of seats) {
    const userIds = userMap.get(seat.memberId);
    if (!userIds || userIds.length === 0) continue;

    const seatDesc = formatSeatDescription(seat, findNeighbors(seats, seat));
    for (const userId of userIds) {
      entries.push({
        userId,
        payload: {
          type,
          title,
          body: `내 자리: ${seatDesc}`,
          link: `/arrangements/${arrangementId}`,
        },
      });
    }
  }

  const result = await notifyBatch(entries);
  logger.info(
    `배치표 ${status} 알림 발송: 알림함 ${result.inserted}건, 푸시 ${result.pushed}건 (실패 ${result.failed})`
  );
}

/**
 * 공유/확정된 배치표에서 좌석 변동 시 변동된 대원에게만 알림
 *
 * @param changedMemberIds 자리가 달라진 대원 ID 집합 (diffSeatChanges 결과)
 */
export async function notifySeatChanges(
  arrangementId: string,
  arrangementDate: string,
  changedMemberIds: Set<string>
): Promise<void> {
  if (changedMemberIds.size === 0) return;

  const seats = await getArrangementSeats(arrangementId);
  const userMap = await getApprovedUserIdsByMember([...changedMemberIds]);
  if (userMap.size === 0) return;

  const displayDate = formatDisplayDate(arrangementDate);
  const seatByMember = new Map(seats.map((s) => [s.memberId, s]));

  const entries: NotifyEntry[] = [];
  for (const memberId of changedMemberIds) {
    const userIds = userMap.get(memberId);
    if (!userIds || userIds.length === 0) continue;

    const seat = seatByMember.get(memberId);
    // 새 배치에서 빠진 대원은 위치 안내 없이 변동 사실만 알림
    const body = seat
      ? `새 자리: ${formatSeatDescription(seat, findNeighbors(seats, seat))}`
      : '이번 배치에서 자리가 변경되었습니다. 배치표를 확인해주세요.';

    for (const userId of userIds) {
      entries.push({
        userId,
        payload: {
          type: 'SEAT_CHANGED',
          title: `${displayDate} 자리배치가 변경되었습니다`,
          body,
          link: `/arrangements/${arrangementId}`,
        },
      });
    }
  }

  const result = await notifyBatch(entries);
  logger.info(
    `좌석 변동 알림 발송: 알림함 ${result.inserted}건, 푸시 ${result.pushed}건 (실패 ${result.failed})`
  );
}
