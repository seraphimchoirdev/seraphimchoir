-- 투표 독려 자동 발송 크론 일시 중지 (전대원 오픈 전)
--
-- 푸시 알림 시스템이 아직 전대원에게 오픈되지 않아, 자동 시스템 푸시 발송은
-- 보류하고 환경(테이블/함수/크론 정의)만 세팅해 두기로 결정 (2026-07-12).
--
-- 이중 안전장치:
--   1) Vault 시크릿(vote_reminder_url, vote_reminder_cron_secret) 미등록
--      → invoke_vote_reminder()가 no-op (20260711120000 마이그레이션 참고)
--   2) 본 마이그레이션으로 크론 잡 자체를 비활성화 (active = false)
--
-- 전대원 오픈 시 재활성화 절차 (docs/PUSH_NOTIFICATION_DEPLOYMENT.md 참고):
--   SELECT vault.create_secret('https://<도메인>/api/cron/vote-reminder', 'vote_reminder_url');
--   SELECT vault.create_secret('<CRON_SECRET>', 'vote_reminder_cron_secret');
--   SELECT cron.alter_job(jobid, active := true) FROM cron.job
--   WHERE jobname IN ('vote-reminder-friday', 'vote-reminder-saturday');

DO $$
DECLARE
  j RECORD;
BEGIN
  -- pg_cron 미설치 환경(일부 로컬/테스트)에서도 마이그레이션이 실패하지 않도록 가드
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'cron' AND table_name = 'job'
  ) THEN
    -- cron.job 직접 UPDATE는 권한이 없으므로 공식 API(alter_job) 사용
    FOR j IN
      SELECT jobid FROM cron.job
      WHERE jobname IN ('vote-reminder-friday', 'vote-reminder-saturday')
    LOOP
      PERFORM cron.alter_job(j.jobid, active := false);
    END LOOP;
  END IF;
END $$;
