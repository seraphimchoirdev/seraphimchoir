-- 출석 마감 테이블
-- 파트별 마감 (part != NULL) 및 전체 마감 (part = NULL) 관리

CREATE TABLE attendance_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  part part NULL,  -- NULL = 전체 마감, 값 있음 = 파트 마감
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 동일 날짜에 같은 파트(또는 전체)는 한 번만 마감 가능
  -- NULLS NOT DISTINCT: NULL 값도 고유 제약에 포함
  UNIQUE NULLS NOT DISTINCT (date, part)
);

-- 날짜별 조회 최적화 인덱스
CREATE INDEX idx_attendance_deadlines_date ON attendance_deadlines(date);

-- RLS 활성화
ALTER TABLE attendance_deadlines ENABLE ROW LEVEL SECURITY;

-- 조회: 인증된 사용자 모두 가능
CREATE POLICY "attendance_deadlines_select_policy" ON attendance_deadlines
  FOR SELECT TO authenticated USING (true);

-- 생성: ADMIN, CONDUCTOR, MANAGER, PART_LEADER만 가능
CREATE POLICY "attendance_deadlines_insert_policy" ON attendance_deadlines
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER')
    )
  );

-- 삭제 (마감 해제): ADMIN, CONDUCTOR만 가능
CREATE POLICY "attendance_deadlines_delete_policy" ON attendance_deadlines
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN', 'CONDUCTOR')
    )
  );

-- 댓글: UPDATE는 필요 없음 (마감 해제는 DELETE 후 재생성으로 처리)
