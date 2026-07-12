import 'server-only';

import {
  formatDisplayDate,
  formatVoteDeadlineDisplay,
  getNextSunday,
} from '@/lib/dashboard-context';
import { createLogger } from '@/lib/logger';
import { notifyUsers } from '@/lib/notifications/notify';
import { createAdminClient } from '@/lib/supabase/server';
import { getServiceDeadline } from '@/lib/vote-deadlines';

const logger = createLogger({ prefix: 'VoteReminder' });

export type VoteReminderResult =
  | { skipped: true; reason: 'deadline_passed' | 'no_targets'; nextSunday: string }
  | {
      skipped?: undefined;
      nextSunday: string;
      targets: number;
      inserted: number;
      pushed: number;
      failed: number;
    };

/**
 * 다음 주일 미투표 대원에게 출석 투표 독려 알림 발송
 *
 * 크론(금 20:00/토 10:00 KST)과 관리자 수동 발송 버튼이 공유하는 핵심 로직.
 * 마감 판정은 대시보드/my-attendance와 동일 규칙
 * (attendance_vote_deadlines 오버라이드 우선, 없으면 토 15:00 KST).
 */
export async function sendVoteReminder(): Promise<VoteReminderResult> {
  const admin = await createAdminClient();
  const nextSunday = getNextSunday();

  // 1) 마감 재확인 — 지났으면 발송하지 않음
  const { data: customDeadline } = await admin
    .from('attendance_vote_deadlines')
    .select('deadline_at')
    .eq('service_date', nextSunday)
    .maybeSingle();

  const deadlineAt = customDeadline?.deadline_at
    ? new Date(customDeadline.deadline_at)
    : getServiceDeadline(nextSunday);

  if (new Date() > deadlineAt) {
    logger.info(`투표 마감 경과로 발송 생략: ${nextSunday}`);
    return { skipped: true, reason: 'deadline_passed', nextSunday };
  }

  // 2) 활성 대원 + 승인된 사용자 계정 조회
  const [{ data: members, error: membersError }, { data: attendances, error: attError }] =
    await Promise.all([
      admin
        .from('members')
        .select('id, user_profiles!linked_member_id(id, link_status)')
        .in('member_status', ['REGULAR', 'NEW'])
        .eq('is_singer', true),
      admin.from('attendances').select('member_id').eq('date', nextSunday),
    ]);

  if (membersError || attError) {
    throw new Error(`대상 조회 실패: ${membersError?.message || attError?.message}`);
  }

  // 3) 미투표 대원 = 해당 날짜 attendances 레코드 없음 (대시보드 hasVoted와 동일 기준)
  const votedMemberIds = new Set(
    (attendances ?? []).map((a: { member_id: string }) => a.member_id)
  );

  const targetUserIds: string[] = [];
  for (const member of members ?? []) {
    if (votedMemberIds.has(member.id)) continue;

    // 대원 1명에 승인 프로필이 여러 개 있을 수 있어 배열 처리
    const profiles = Array.isArray(member.user_profiles)
      ? member.user_profiles
      : member.user_profiles
        ? [member.user_profiles]
        : [];
    for (const profile of profiles) {
      if (profile.link_status === 'approved') {
        targetUserIds.push(profile.id);
      }
    }
  }

  if (targetUserIds.length === 0) {
    logger.info(`미투표 대상 없음: ${nextSunday}`);
    return { skipped: true, reason: 'no_targets', nextSunday };
  }

  // 4) 발송
  const result = await notifyUsers(targetUserIds, {
    type: 'VOTE_REMINDER',
    title: '출석 투표를 잊으셨나요?',
    body: `${formatDisplayDate(nextSunday)} 예배 등단 여부를 알려주세요. 마감: ${formatVoteDeadlineDisplay(deadlineAt.toISOString())}`,
    link: '/my-attendance',
  });

  logger.info(
    `투표 독려 발송 완료: 대상 ${targetUserIds.length}명, 알림함 ${result.inserted}건, 푸시 ${result.pushed}건`
  );

  return { nextSunday, targets: targetUserIds.length, ...result };
}
