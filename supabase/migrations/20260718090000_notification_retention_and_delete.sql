-- 알림 보관 정책 조정 + 정리 자동화 + 본인 알림 삭제 허용 (2026-07-18)
--
-- 1) 읽은 알림 보관 기간: 90일 → 7일 (배치표 알림은 주 단위로 소용이 다함)
-- 2) 주 1회 자동 정리 pg_cron 등록 (월요일 04:00 KST = 일요일 19:00 UTC)
--    — DB 내부 정리 작업이라 푸시 발송과 무관 (자동 발송 보류 방침에 영향 없음)
-- 3) 대원이 알림함에서 자신의 읽은 알림을 직접 지울 수 있도록 DELETE 정책 추가

-- 1. 정리 함수 재정의 (보관 일수 파라미터화, 기본 7일)
--    시그니처가 달라지므로 기존 무인자 함수를 먼저 제거 (CREATE OR REPLACE는 오버로드가 됨)
DROP FUNCTION IF EXISTS public.cleanup_old_notifications();

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(retention_days INTEGER DEFAULT 7)
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
    AND read_at < now() - make_interval(days => retention_days);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_notifications(INTEGER)
  IS '읽은 지 retention_days(기본 7일) 경과한 알림 삭제. 미읽음 알림은 유지.';

-- 2. 주 1회 자동 정리 크론 (pg_cron 미설치 환경 가드)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'cron' AND table_name = 'job'
  ) THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-read-notifications') THEN
      PERFORM cron.unschedule('cleanup-read-notifications');
    END IF;
    -- 일요일 19:00 UTC = 월요일 04:00 KST (주일 알림 수명이 끝난 직후)
    PERFORM cron.schedule(
      'cleanup-read-notifications',
      '0 19 * * 0',
      $job$SELECT public.cleanup_old_notifications(7)$job$
    );
  END IF;
END $$;

-- 3. 본인 알림 삭제 정책 (알림함 '읽은 알림 지우기' 기능용)
DROP POLICY IF EXISTS "Users delete own notifications" ON notifications;
CREATE POLICY "Users delete own notifications"
  ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());
