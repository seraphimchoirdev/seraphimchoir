-- 등단 투표 마감 시스템
-- 예배별 등단 가능 여부 투표 마감 시간 관리

-- 1. attendance_vote_deadlines 테이블 생성
CREATE TABLE IF NOT EXISTS attendance_vote_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 대상 예배
  service_date DATE NOT NULL,       -- 해당 예배 날짜

  -- 마감 정보
  deadline_at TIMESTAMPTZ NOT NULL, -- 마감 시각 (예: 금요일 18:00 KST)

  -- 메타
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 제약조건: 같은 예배 날짜에 하나의 마감만
  UNIQUE(service_date)
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_vote_deadlines_service_date ON attendance_vote_deadlines(service_date);
CREATE INDEX IF NOT EXISTS idx_vote_deadlines_deadline_at ON attendance_vote_deadlines(deadline_at);

-- 3. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_vote_deadlines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vote_deadlines_updated_at ON attendance_vote_deadlines;
CREATE TRIGGER vote_deadlines_updated_at
  BEFORE UPDATE ON attendance_vote_deadlines
  FOR EACH ROW
  EXECUTE FUNCTION update_vote_deadlines_updated_at();

-- 4. RLS 활성화
ALTER TABLE attendance_vote_deadlines ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책
DROP POLICY IF EXISTS "Vote deadlines are viewable by all authenticated" ON attendance_vote_deadlines;
DROP POLICY IF EXISTS "Vote deadlines are manageable by managers" ON attendance_vote_deadlines;

-- 조회: 모든 인증된 사용자 (마감 시간 확인용)
CREATE POLICY "Vote deadlines are viewable by all authenticated"
  ON attendance_vote_deadlines FOR SELECT
  TO authenticated
  USING (true);

-- 관리: MANAGER 이상만
CREATE POLICY "Vote deadlines are manageable by managers"
  ON attendance_vote_deadlines FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']));

-- 6. 특정 날짜의 마감 여부 확인 함수
CREATE OR REPLACE FUNCTION is_vote_deadline_passed(target_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM attendance_vote_deadlines
    WHERE service_date = target_date
      AND deadline_at < now()
  );
$$;

-- 7. 다음 투표 마감 정보 조회 함수
CREATE OR REPLACE FUNCTION get_upcoming_vote_deadlines(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  service_date DATE,
  deadline_at TIMESTAMPTZ,
  is_passed BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    service_date,
    deadline_at,
    deadline_at < now() AS is_passed
  FROM attendance_vote_deadlines
  WHERE service_date >= CURRENT_DATE
  ORDER BY service_date ASC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION is_vote_deadline_passed(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_vote_deadlines(INTEGER) TO authenticated;

-- 주석:
-- - service_date: 해당 예배 날짜 (일요일)
-- - deadline_at: 투표 마감 시각 (예: 해당 주 금요일 18:00)
-- - 마감 후에는 개인 투표 수정 불가 (파트장/관리자는 가능)
-- - 기본 마감 시간은 애플리케이션 레벨에서 계산 (해당 주 금요일 18:00 등)
