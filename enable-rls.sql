-- RLS 활성화 SQL
-- Supabase 대시보드 SQL Editor에서 실행하세요
-- https://supabase.com/dashboard/project/gjxvxcqujimkalloedbe/sql/new

-- 모든 테이블에 RLS 활성화
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 확인 쿼리 (실행 후 모두 true로 나와야 함)
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('members', 'attendances', 'arrangements', 'seats', 'user_profiles')
ORDER BY tablename;
