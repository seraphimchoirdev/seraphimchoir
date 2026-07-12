import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { resolveAudienceUserIds, type ManualAudience } from '@/lib/notifications/audience';
import { notifyUsers } from '@/lib/notifications/notify';
import { MANUAL_NOTIFY_ROLES } from '@/lib/notifications/notify-constants';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'ManualNotifyAPI' });

const partSchema = z.enum(['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL']);

const sendSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이내여야 합니다'),
  body: z.string().min(1, '내용을 입력해주세요').max(500, '내용은 500자 이내여야 합니다'),
  link: z
    .string()
    .regex(/^\//, '링크는 앱 내 경로(/로 시작)만 가능합니다')
    .max(300)
    .optional(),
  audience: z.discriminatedUnion('type', [
    z.object({ type: z.literal('ALL') }),
    z.object({ type: z.literal('PART'), parts: z.array(partSchema).min(1, '파트를 선택해주세요') }),
    z.object({
      type: z.literal('MEMBERS'),
      memberIds: z.array(z.string().uuid()).min(1, '대원을 선택해주세요'),
    }),
  ]),
});

/**
 * POST /api/notifications/send
 * 운영진 자유 작성 알림 발송 (대상: 전체/파트/개인)
 */
export async function POST(request: NextRequest) {
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

    const json = await request.json();
    const parsed = sendSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '입력값이 유효하지 않습니다' },
        { status: 400 }
      );
    }

    const { title, body, link, audience } = parsed.data;

    const targetUserIds = await resolveAudienceUserIds(audience as ManualAudience);

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: '발송 대상이 없습니다 (연결된 계정이 있는 대원이 없음)' },
        { status: 400 }
      );
    }

    const result = await notifyUsers(targetUserIds, {
      type: 'MANUAL',
      title,
      body,
      link,
    });

    logger.info(
      `수동 알림 발송 (by ${user.id}): 대상 ${targetUserIds.length}명, 알림함 ${result.inserted}건, 푸시 ${result.pushed}건`
    );

    return NextResponse.json({ success: true, targets: targetUserIds.length, ...result });
  } catch (error) {
    logger.error('수동 알림 발송 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
