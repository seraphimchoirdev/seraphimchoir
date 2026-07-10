import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'PushSubscriptionsAPI' });

// PushSubscription.toJSON() 형태
const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url('유효한 endpoint URL이 아닙니다'),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  userAgent: z.string().max(500).optional(),
});

/**
 * POST /api/push/subscriptions
 * 현재 사용자의 웹푸시 구독 등록 (같은 endpoint 재등록 시 upsert)
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

    const body = await request.json();
    const parsed = subscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '유효하지 않은 구독 정보입니다', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { subscription, userAgent } = parsed.data;

    // RLS: 본인 user_id 행만 upsert 가능
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent ?? null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      logger.error('구독 저장 실패:', error.message);
      return NextResponse.json({ error: '구독 저장에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('구독 등록 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscriptions
 * 현재 사용자의 웹푸시 구독 해지 (endpoint 기준, 본인 것만)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : null;

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint가 필요합니다' }, { status: 400 });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);

    if (error) {
      logger.error('구독 삭제 실패:', error.message);
      return NextResponse.json({ error: '구독 삭제에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('구독 해지 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
