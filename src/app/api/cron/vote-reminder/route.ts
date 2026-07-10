import { NextRequest, NextResponse } from 'next/server';

import {
  formatDisplayDate,
  formatVoteDeadlineDisplay,
  getNextSunday,
} from '@/lib/dashboard-context';
import { createLogger } from '@/lib/logger';
import { notifyUsers } from '@/lib/notifications/notify';
import { createAdminClient } from '@/lib/supabase/server';
import { getServiceDeadline } from '@/lib/vote-deadlines';

const logger = createLogger({ prefix: 'VoteReminderCron' });

/**
 * GET /api/cron/vote-reminder
 *
 * 출석 투표 독려 알림 (Vercel Cron: 금 20:00 / 토 10:00 KST)
 * 그 시점까지 미투표한 활성 대원의 승인된 사용자 계정에만 발송한다.
 * 마감 판정은 대시보드/my-attendance와 동일 규칙
 * (attendance_vote_deadlines 오버라이드 우선, 없으면 토 15:00 KST).
 */
export async function GET(request: NextRequest) {
  // Vercel Cron이 자동으로 첨부하는 Authorization 헤더 검증
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  try {
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
      return NextResponse.json({ skipped: true, reason: 'deadline_passed', nextSunday });
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
      logger.error('대상 조회 실패:', membersError?.message || attError?.message);
      return NextResponse.json({ error: '대상 조회에 실패했습니다' }, { status: 500 });
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
      return NextResponse.json({ skipped: true, reason: 'no_targets', nextSunday });
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

    return NextResponse.json({
      success: true,
      nextSunday,
      targets: targetUserIds.length,
      ...result,
    });
  } catch (error) {
    logger.error('투표 독려 크론 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
