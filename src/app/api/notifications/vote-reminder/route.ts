import { NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { MANUAL_NOTIFY_ROLES } from '@/lib/notifications/notify-constants';
import { sendVoteReminder } from '@/lib/notifications/vote-reminder';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'ManualVoteReminderAPI' });

/**
 * POST /api/notifications/vote-reminder
 * 운영진이 미투표 대원에게 즉시 투표 독려 알림을 발송 (크론과 동일 로직 공유)
 */
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile?.role || !(MANUAL_NOTIFY_ROLES as readonly string[]).includes(profile.role)) {
      return NextResponse.json({ error: '알림 발송 권한이 없습니다' }, { status: 403 });
    }

    const result = await sendVoteReminder();
    logger.info(`수동 투표 독려 발송 (by ${user.id}):`, JSON.stringify(result));

    return NextResponse.json(result.skipped ? result : { success: true, ...result });
  } catch (error) {
    logger.error('수동 투표 독려 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
