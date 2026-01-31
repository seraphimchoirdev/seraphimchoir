-- audit_logs 테이블의 user_profiles 참조 RLS 정책 추가
-- 이 마이그레이션은 initial_schema(user_profiles 생성) 이후에 실행됨
-- 20240120_create_audit_logs.sql에서 user_profiles가 아직 없어서 생성 못한 정책을 보완

DO $$
BEGIN
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
END $$;
