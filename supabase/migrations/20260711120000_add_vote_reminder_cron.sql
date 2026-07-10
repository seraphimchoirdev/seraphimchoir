-- 투표 독려 알림 크론 (pg_cron + pg_net)
--
-- Vercel Cron 대신 DB 스케줄러가 앱의 /api/cron/vote-reminder를 HTTP 호출한다.
-- URL과 CRON_SECRET은 저장소에 남기지 않도록 Supabase Vault에서 읽는다:
--   SELECT vault.create_secret('https://<도메인>/api/cron/vote-reminder', 'vote_reminder_url');
--   SELECT vault.create_secret('<CRON_SECRET>', 'vote_reminder_cron_secret');
-- Vault에 시크릿이 없으면(로컬 등) 잡은 등록되어 있어도 조용히 no-op 한다.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Vault에서 대상 URL/시크릿을 읽어 크론 라우트를 호출하는 래퍼.
-- 시크릿 미설정 환경에서는 아무것도 하지 않으므로 로컬 db reset에도 안전하다.
CREATE OR REPLACE FUNCTION public.invoke_vote_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT;
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets WHERE name = 'vote_reminder_url';

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'vote_reminder_cron_secret';

  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE NOTICE 'vote_reminder: Vault 시크릿 미설정으로 호출 생략';
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret)
  );
END;
$$;

-- Vault를 읽는 함수이므로 API 사용자(anon/authenticated)의 실행을 차단
REVOKE EXECUTE ON FUNCTION public.invoke_vote_reminder() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invoke_vote_reminder() FROM anon, authenticated;

-- 스케줄 등록 (pg_cron은 UTC 기준)
-- 금 20:00 KST = 금 11:00 UTC / 토 10:00 KST = 토 01:00 UTC
-- 재실행에 안전하도록 기존 잡이 있으면 먼저 제거한다.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'vote-reminder-friday') THEN
    PERFORM cron.unschedule('vote-reminder-friday');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'vote-reminder-saturday') THEN
    PERFORM cron.unschedule('vote-reminder-saturday');
  END IF;

  PERFORM cron.schedule(
    'vote-reminder-friday',
    '0 11 * * 5',
    'SELECT public.invoke_vote_reminder();'
  );
  PERFORM cron.schedule(
    'vote-reminder-saturday',
    '0 1 * * 6',
    'SELECT public.invoke_vote_reminder();'
  );
END;
$$;
