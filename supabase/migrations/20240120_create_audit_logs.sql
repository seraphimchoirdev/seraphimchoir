-- 보안 감사 로그 테이블 생성
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 이벤트 정보
  event_type VARCHAR(50) NOT NULL, -- 'login_success', 'login_failed', 'rate_limit', 'csp_violation', 등
  event_category VARCHAR(50) NOT NULL, -- 'auth', 'security', 'api', 등
  severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'

  -- 사용자 정보
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),

  -- 요청 정보
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path TEXT,
  request_params JSONB,

  -- 응답 정보
  response_status INT,
  response_time_ms INT,

  -- 추가 메타데이터
  metadata JSONB,
  error_message TEXT,

  -- 인덱스용 필드
  is_suspicious BOOLEAN DEFAULT FALSE,
  is_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ
);

-- 인덱스 생성 (빠른 조회를 위해)
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_event_category ON public.audit_logs(event_category);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_ip_address ON public.audit_logs(ip_address);
CREATE INDEX idx_audit_logs_is_suspicious ON public.audit_logs(is_suspicious) WHERE is_suspicious = TRUE;
CREATE INDEX idx_audit_logs_severity ON public.audit_logs(severity);

-- RLS 정책 (읽기는 관리자만, 쓰기는 서비스 역할만)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 서비스 역할만 삽입 가능 (API에서 Service Role Key 사용)
CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- user_profiles 참조 정책은 해당 테이블 생성 후 적용
-- (이 마이그레이션은 initial_schema보다 먼저 실행될 수 있으므로 DO 블록 사용)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    -- 관리자만 읽기 가능
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin users can view audit logs') THEN
      EXECUTE $policy$
        CREATE POLICY "Admin users can view audit logs" ON public.audit_logs
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_profiles
              WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('ADMIN', 'MANAGER')
            )
          )
      $policy$;
    END IF;

    -- 관리자만 업데이트 가능 (리뷰 표시용)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin users can update audit logs') THEN
      EXECUTE $policy$
        CREATE POLICY "Admin users can update audit logs" ON public.audit_logs
          FOR UPDATE
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_profiles
              WHERE user_profiles.id = auth.uid()
              AND user_profiles.role = 'ADMIN'
            )
          )
          WITH CHECK (
            is_reviewed IS NOT NULL AND reviewed_by IS NOT NULL
          )
      $policy$;
    END IF;
  END IF;
END $$;

-- 보안 이벤트 요약 뷰
CREATE OR REPLACE VIEW public.security_summary AS
SELECT
  DATE(created_at) as date,
  event_category,
  event_type,
  severity,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT ip_address) as unique_ips,
  SUM(CASE WHEN is_suspicious THEN 1 ELSE 0 END) as suspicious_count
FROM public.audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), event_category, event_type, severity
ORDER BY date DESC, event_count DESC;

-- 의심스러운 활동 감지 함수
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- 동일 IP에서 5분 내 10회 이상 로그인 실패
  IF NEW.event_type = 'login_failed' THEN
    IF (
      SELECT COUNT(*)
      FROM audit_logs
      WHERE ip_address = NEW.ip_address
      AND event_type = 'login_failed'
      AND created_at > NOW() - INTERVAL '5 minutes'
    ) >= 10 THEN
      NEW.is_suspicious := TRUE;
      NEW.severity := 'critical';
    END IF;
  END IF;

  -- 동일 IP에서 1분 내 Rate Limit 5회 이상 위반
  IF NEW.event_type = 'rate_limit_exceeded' THEN
    IF (
      SELECT COUNT(*)
      FROM audit_logs
      WHERE ip_address = NEW.ip_address
      AND event_type = 'rate_limit_exceeded'
      AND created_at > NOW() - INTERVAL '1 minute'
    ) >= 5 THEN
      NEW.is_suspicious := TRUE;
      NEW.severity := 'warning';
    END IF;
  END IF;

  -- 비정상적인 시간대 로그인 (새벽 2-5시)
  IF NEW.event_type = 'login_success' AND
     EXTRACT(HOUR FROM NEW.created_at AT TIME ZONE 'Asia/Seoul') BETWEEN 2 AND 5 THEN
    NEW.metadata := COALESCE(NEW.metadata, '{}'::JSONB) ||
                    '{"unusual_time": true}'::JSONB;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER audit_log_suspicious_detection
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION detect_suspicious_activity();

-- 30일 이상 된 로그 자동 삭제 (GDPR 준수)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  -- 일반 로그는 30일 후 삭제
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND severity IN ('info', 'warning')
  AND is_suspicious = FALSE;

  -- 의심스러운 로그는 90일 보관
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND (severity IN ('error', 'critical') OR is_suspicious = TRUE);
END;
$$ LANGUAGE plpgsql;

-- 매일 자정에 실행되는 크론 작업 (pg_cron 확장 필요)
-- Supabase 대시보드에서 수동으로 설정 필요:
-- SELECT cron.schedule('cleanup-audit-logs', '0 0 * * *', 'SELECT cleanup_old_audit_logs();');