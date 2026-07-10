-- 푸시 알림 시스템 (1차)
--
-- push_subscriptions: Web Push(VAPID) 브라우저 구독 저장 (사용자당 기기별 다건)
-- notifications: 인앱 알림함 — 알림의 단일 진실 원천. 웹푸시는 전달 채널일 뿐이며
--                푸시 권한이 없는 사용자도 알림함에서 확인할 수 있다.

-- ============================================================
-- push_subscriptions
-- ============================================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 본인 구독만 조회/등록/수정/삭제 가능 (발송 시 조회는 service role이 RLS 우회)
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'VOTE_REMINDER',
    'ARRANGEMENT_SHARED',
    'ARRANGEMENT_CONFIRMED',
    'SEAT_CHANGED',
    -- 2차 예약값 (공지/커뮤니티)
    'NOTICE_POSTED',
    'COMMENT_REPLY',
    'POST_LIKED'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 조회/읽음 처리는 본인 것만. INSERT 정책은 의도적으로 없음 —
-- 알림 생성은 서버(service role, RLS 우회) 전용이다.
CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 오래된 알림 정리 (읽은 지 90일 경과분 삭제, 1차에서는 수동 실행)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE read_at IS NOT NULL
    AND read_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
