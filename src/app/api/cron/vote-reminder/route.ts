import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { sendVoteReminder } from '@/lib/notifications/vote-reminder';

const logger = createLogger({ prefix: 'VoteReminderCron' });

/**
 * GET /api/cron/vote-reminder
 *
 * 출석 투표 독려 알림 (pg_cron: 금 20:00 / 토 10:00 KST → invoke_vote_reminder()가 호출)
 * 발송 로직은 관리자 수동 발송과 공유 — src/lib/notifications/vote-reminder.ts
 */
export async function GET(request: NextRequest) {
  // pg_cron(invoke_vote_reminder)이 첨부하는 Authorization 헤더 검증
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  try {
    const result = await sendVoteReminder();
    return NextResponse.json(result.skipped ? result : { success: true, ...result });
  } catch (error) {
    logger.error('투표 독려 크론 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
