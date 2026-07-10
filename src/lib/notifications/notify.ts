import 'server-only';

import * as Sentry from '@sentry/nextjs';
import webpush from 'web-push';

import {
  getVapidPrivateKey,
  getVapidPublicKey,
  getVapidSubject,
} from '@/lib/env-validation';
import { createLogger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'Notify' });

export type NotificationType =
  | 'VOTE_REMINDER'
  | 'ARRANGEMENT_SHARED'
  | 'ARRANGEMENT_CONFIRMED'
  | 'SEAT_CHANGED'
  // 2차 예약값
  | 'NOTICE_POSTED'
  | 'COMMENT_REPLY'
  | 'POST_LIKED';

export interface NotifyPayload {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

export interface NotifyResult {
  inserted: number;
  pushed: number;
  failed: number;
}

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(getVapidSubject(), getVapidPublicKey(), getVapidPrivateKey());
  vapidConfigured = true;
}

export interface NotifyEntry {
  userId: string;
  payload: NotifyPayload;
}

/**
 * 동일 내용을 여러 사용자에게 발송 (서버 전용)
 */
export async function notifyUsers(
  userIds: string[],
  payload: NotifyPayload
): Promise<NotifyResult> {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
  return notifyBatch(uniqueUserIds.map((userId) => ({ userId, payload })));
}

/**
 * 알림 발송 단일 진입점 (서버 전용) — 사용자별로 다른 내용도 한 번에 발송.
 *
 * 1) notifications 테이블에 일괄 INSERT — 인앱 알림함의 단일 진실 원천.
 *    실패 시 throw (알림 자체가 기록되지 않은 심각한 상태).
 * 2) 대상 사용자의 push_subscriptions로 웹푸시 fan-out — best-effort.
 *    410/404(만료 구독)는 자동 삭제하고, 그 외 실패는 Sentry에 기록만 한다.
 *    푸시가 전부 실패해도 알림함에는 항상 남는다.
 */
export async function notifyBatch(entries: NotifyEntry[]): Promise<NotifyResult> {
  const valid = entries.filter((e) => !!e.userId);
  if (valid.length === 0) {
    return { inserted: 0, pushed: 0, failed: 0 };
  }

  const admin = await createAdminClient();

  const rows = valid.map(({ userId, payload }) => ({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    link: payload.link ?? null,
  }));

  const { data: inserted, error: insertError } = await admin
    .from('notifications')
    .insert(rows)
    .select('id');

  if (insertError) {
    logger.error('notifications INSERT 실패:', insertError.message);
    Sentry.captureException(new Error(`알림 저장 실패: ${insertError.message}`), {
      tags: { module: 'notify' },
    });
    throw new Error(`알림 저장 실패: ${insertError.message}`);
  }

  const { pushed, failed } = await sendWebPush(valid);

  return { inserted: inserted?.length ?? 0, pushed, failed };
}

async function sendWebPush(entries: NotifyEntry[]): Promise<{ pushed: number; failed: number }> {
  const admin = await createAdminClient();

  // 같은 사용자에게 여러 건이면 마지막 payload를 푸시 (알림함에는 전부 남음)
  const payloadByUser = new Map(entries.map((e) => [e.userId, e.payload]));
  const userIds = [...payloadByUser.keys()];

  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id')
    .in('user_id', userIds);

  if (error || !subscriptions || subscriptions.length === 0) {
    if (error) logger.warn('push_subscriptions 조회 실패:', error.message);
    return { pushed: 0, failed: 0 };
  }

  try {
    ensureVapidConfigured();
  } catch (e) {
    // VAPID 미설정 환경(로컬 등)에서는 푸시만 건너뛴다 — 알림함 기록은 이미 완료됨
    logger.warn('VAPID 미설정으로 웹푸시 발송 생략:', (e as Error).message);
    return { pushed: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) => {
      const payload = payloadByUser.get(sub.user_id)!;
      // sw.js push 핸들러가 기대하는 형식: { title, body, url }
      const pushBody = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.link ?? '/',
      });
      return webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        pushBody
      );
    })
  );

  let pushed = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      pushed++;
      return;
    }
    failed++;
    const err = result.reason as { statusCode?: number; message?: string };
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      expiredIds.push(subscriptions[i].id);
      return;
    }
    logger.warn(`웹푸시 발송 실패 (${subscriptions[i].id}):`, err?.message);
    Sentry.captureException(result.reason, {
      tags: { module: 'notify' },
    });
  });

  if (expiredIds.length > 0) {
    const { error: deleteError } = await admin
      .from('push_subscriptions')
      .delete()
      .in('id', expiredIds);
    if (deleteError) {
      logger.warn('만료 구독 삭제 실패:', deleteError.message);
    } else {
      logger.info(`만료된 푸시 구독 ${expiredIds.length}건 삭제`);
    }
  }

  return { pushed, failed };
}
