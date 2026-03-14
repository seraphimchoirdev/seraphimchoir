-- =============================================
-- 새로핌지(소식지) + 기도 담당 테이블 생성
-- STAFF → SECRETARY(서기) + TREASURER(회계) 역할 세분화
-- =============================================

-- =============================================
-- 1. 역할 세분화: STAFF → SECRETARY + TREASURER
-- =============================================

-- 1-1. is_valid_role에 새 역할 추가 (STAFF 제거)
CREATE OR REPLACE FUNCTION public.is_valid_role(check_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN check_role IN ('ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY', 'TREASURER', 'PART_LEADER', 'MEMBER');
END;
$$;

-- 1-2. 기존 STAFF → title 기반으로 SECRETARY/TREASURER 마이그레이션
-- title이 '서기' 또는 '부서기'인 경우 SECRETARY, '회계' 또는 '부회계'인 경우 TREASURER
-- 그 외(대장 등)는 MANAGER로 편입
UPDATE user_profiles SET role = 'SECRETARY' WHERE role = 'STAFF' AND title IN ('서기', '부서기');
UPDATE user_profiles SET role = 'TREASURER' WHERE role = 'STAFF' AND title IN ('회계', '부회계');
UPDATE user_profiles SET role = 'MANAGER' WHERE role = 'STAFF'; -- 나머지(대장 등)

-- 1-3. 역할 코멘트 업데이트
COMMENT ON COLUMN user_profiles.role IS '역할 (ADMIN, CONDUCTOR, MANAGER, SECRETARY, TREASURER, PART_LEADER, MEMBER)';

-- 1-4. RLS 정책 업데이트: documents 테이블의 STAFF → SECRETARY, TREASURER
DROP POLICY IF EXISTS "Documents viewable by staff and above" ON documents;
CREATE POLICY "Documents viewable by staff and above"
  ON documents FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY', 'TREASURER']));

-- =============================================
-- 2. newsletters 테이블 생성
-- =============================================
CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_date DATE NOT NULL UNIQUE,
  volume INT NOT NULL,              -- 제N권
  issue_number INT NOT NULL,        -- N호 (연도 내)
  serial_number INT NOT NULL,       -- 통권 N호
  year_motto TEXT,
  publisher_name TEXT DEFAULT '송혁진',
  editor_name TEXT DEFAULT '김택훈',
  editor_weekly_name TEXT DEFAULT '이수지',
  announcements TEXT DEFAULT '',     -- 줄바꿈 구분 bullet 목록
  fixed_footer_text TEXT DEFAULT E'후원계좌: 국민 293801-01-184111 (새로핌찬양대)\n둘째주, 넷째주 연습 전에는 목사님의 성경 공부가 있으며, 성경 공부 직후 찬양연습을 진행합니다.',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_newsletters_issue_date ON newsletters(issue_date DESC);
CREATE INDEX idx_newsletters_status ON newsletters(status);

-- RLS 활성화
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

-- 발행된 소식지: 모든 인증 사용자 조회 가능
CREATE POLICY "Published newsletters viewable by all authenticated"
  ON newsletters FOR SELECT
  TO authenticated
  USING (status = 'PUBLISHED');

-- 초안 소식지: ADMIN, SECRETARY만 조회 가능
CREATE POLICY "Draft newsletters viewable by admin and secretary"
  ON newsletters FOR SELECT
  TO authenticated
  USING (
    status = 'DRAFT'
    AND public.has_role(ARRAY['ADMIN', 'SECRETARY'])
  );

-- INSERT: ADMIN, SECRETARY
CREATE POLICY "Newsletters insertable by admin and secretary"
  ON newsletters FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'SECRETARY']));

-- UPDATE: ADMIN, SECRETARY, MANAGER (앱 레벨에서 MANAGER는 announcements만)
CREATE POLICY "Newsletters updatable by admin secretary manager"
  ON newsletters FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'SECRETARY', 'MANAGER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'SECRETARY', 'MANAGER']));

-- DELETE: ADMIN만
CREATE POLICY "Newsletters deletable by admin only"
  ON newsletters FOR DELETE
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN']));

-- =============================================
-- 3. prayer_assignments 테이블 생성
-- =============================================
CREATE TABLE prayer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  prayer_names TEXT NOT NULL DEFAULT '',  -- "민경실/오연분" 형태
  gown_part TEXT NOT NULL DEFAULT '',     -- "소프라노" 등
  quarter TEXT NOT NULL,                  -- "2026-Q1"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_prayer_assignments_date ON prayer_assignments(date);
CREATE INDEX idx_prayer_assignments_quarter ON prayer_assignments(quarter);

-- RLS 활성화
ALTER TABLE prayer_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT: 모든 인증 사용자
CREATE POLICY "Prayer assignments viewable by all authenticated"
  ON prayer_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- INSERT: ADMIN, SECRETARY
CREATE POLICY "Prayer assignments insertable by admin and secretary"
  ON prayer_assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'SECRETARY']));

-- UPDATE: ADMIN, SECRETARY
CREATE POLICY "Prayer assignments updatable by admin and secretary"
  ON prayer_assignments FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'SECRETARY']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'SECRETARY']));

-- DELETE: ADMIN, SECRETARY
CREATE POLICY "Prayer assignments deletable by admin and secretary"
  ON prayer_assignments FOR DELETE
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'SECRETARY']));
