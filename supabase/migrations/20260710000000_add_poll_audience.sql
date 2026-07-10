-- =============================================
-- 설문/투표 대상(audience) 지원
-- 전체(ALL) / 임원(STAFF) / 특정 파트(PART) 한정 설문
-- 정책 결정:
--   - 대상이 아닌 대원에게는 설문 자체를 숨김 (RLS SELECT 차단)
--   - 파트장(PART_LEADER)은 자기 파트 대상 설문만 생성 가능
--   - 결과 공개 시점은 설문별 선택 (show_results_before_close):
--     참석 조사는 즉시 공개, 의견 수렴형은 마감 후 공개가 기본 (API에서 기본값 결정)
--     마감 전 비공개여도 생성자·운영진은 중간 집계 열람 가능
-- =============================================

-- =============================================
-- 1. polls에 대상/결과공개 컬럼 추가
-- =============================================
ALTER TABLE polls ADD COLUMN audience_type TEXT NOT NULL DEFAULT 'ALL'
  CHECK (audience_type IN ('ALL', 'STAFF', 'PART'));

ALTER TABLE polls ADD COLUMN target_parts part[] DEFAULT NULL;

-- 마감 전 결과(집계·응답자) 공개 여부. false면 마감 후에만 공개
ALTER TABLE polls ADD COLUMN show_results_before_close BOOLEAN NOT NULL DEFAULT true;

-- PART 대상이면 target_parts 필수, 그 외에는 NULL이어야 함
ALTER TABLE polls ADD CONSTRAINT polls_target_parts_check CHECK (
  (audience_type = 'PART' AND target_parts IS NOT NULL AND array_length(target_parts, 1) > 0)
  OR (audience_type <> 'PART' AND target_parts IS NULL)
);

COMMENT ON COLUMN polls.audience_type IS '설문 대상 (ALL: 전 대원, STAFF: 임원, PART: 특정 파트)';
COMMENT ON COLUMN polls.target_parts IS 'PART 대상일 때 대상 파트 목록 (예: {SOPRANO,ALTO})';
COMMENT ON COLUMN polls.show_results_before_close IS '마감 전 결과 공개 여부 (false: 마감 후 공개, 생성자·운영진은 예외)';

-- =============================================
-- 2. 대상 여부 판별 함수
-- 현재 사용자가 해당 설문의 대상인지 판별 (SELECT/INSERT 정책 공용)
-- =============================================
CREATE OR REPLACE FUNCTION public.is_in_poll_audience(
  p_audience_type TEXT,
  p_target_parts part[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT CASE p_audience_type
    WHEN 'ALL' THEN true
    WHEN 'STAFF' THEN public.has_role(
      ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY', 'TREASURER', 'PART_LEADER']
    )
    WHEN 'PART' THEN public.get_linked_member_part() = ANY(p_target_parts)
    ELSE false
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_in_poll_audience(TEXT, part[]) TO authenticated;

-- =============================================
-- 3. polls RLS 갱신
-- =============================================

-- SELECT: 대상자 + 생성자 + 운영진(ADMIN/CONDUCTOR/MANAGER)만 조회 가능 (완전 숨김)
DROP POLICY IF EXISTS "Polls viewable by all authenticated" ON polls;
DROP POLICY IF EXISTS "Polls viewable by audience" ON polls;
CREATE POLICY "Polls viewable by audience"
  ON polls FOR SELECT TO authenticated
  USING (
    is_deleted = false
    AND (
      created_by = auth.uid()
      OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
      OR public.is_in_poll_audience(audience_type, target_parts)
    )
  );

-- INSERT: 상위 운영진은 모든 대상, 파트장은 자기 파트 대상만
DROP POLICY IF EXISTS "Polls insertable by leaders" ON polls;
CREATE POLICY "Polls insertable by leaders"
  ON polls FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_member_linked()
    AND (
      public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY', 'TREASURER'])
      OR (
        public.has_role(ARRAY['PART_LEADER'])
        AND audience_type = 'PART'
        AND target_parts = ARRAY[public.get_linked_member_part()]
      )
    )
  );

-- =============================================
-- 4. poll_options RLS 갱신
-- polls의 SELECT 정책이 EXISTS 서브쿼리 안에서도 적용되므로
-- 부모 설문이 숨겨지면 선택지도 자동으로 숨겨짐
-- =============================================
DROP POLICY IF EXISTS "Poll options viewable by all authenticated" ON poll_options;
DROP POLICY IF EXISTS "Poll options viewable by poll audience" ON poll_options;
CREATE POLICY "Poll options viewable by poll audience"
  ON poll_options FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id)
  );

-- =============================================
-- 5. poll_responses RLS 갱신
-- =============================================

-- SELECT: 설문이 보이는 사람 중에서도
--   - 본인 응답은 항상 조회 가능
--   - 타인 응답은 결과 공개 조건 충족 시(즉시 공개 or 마감됨) 조회 가능
--   - 생성자·운영진은 마감 전 비공개 설문도 중간 집계 열람 가능
-- (polls의 SELECT 정책이 EXISTS 서브쿼리에 적용되어 대상 아님 → 자동 차단)
DROP POLICY IF EXISTS "Poll responses viewable by all authenticated" ON poll_responses;
DROP POLICY IF EXISTS "Poll responses viewable by poll audience" ON poll_responses;
CREATE POLICY "Poll responses viewable by poll audience"
  ON poll_responses FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_responses.poll_id
        AND (
          p.show_results_before_close = true
          OR p.is_closed = true
          OR (p.deadline_at IS NOT NULL AND p.deadline_at <= now())
          OR p.created_by = auth.uid()
          OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
        )
    )
  );

-- INSERT: 대상자만 + 마감 전 + 열려 있는 설문만
DROP POLICY IF EXISTS "Poll responses insertable by linked members" ON poll_responses;
DROP POLICY IF EXISTS "Poll responses insertable by audience members" ON poll_responses;
CREATE POLICY "Poll responses insertable by audience members"
  ON poll_responses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_member_linked()
    AND EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_responses.poll_id
        AND p.is_deleted = false
        AND p.is_closed = false
        AND (p.deadline_at IS NULL OR p.deadline_at > now())
        AND public.is_in_poll_audience(p.audience_type, p.target_parts)
    )
  );

-- UPDATE: 본인 응답만, 마감 전에만 변경 가능
DROP POLICY IF EXISTS "Poll responses updatable by owner" ON poll_responses;
CREATE POLICY "Poll responses updatable by owner"
  ON poll_responses FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_responses.poll_id
        AND p.is_deleted = false
        AND p.is_closed = false
        AND (p.deadline_at IS NULL OR p.deadline_at > now())
    )
  );

-- DELETE: 본인 응답 취소는 마감 전에만, ADMIN은 항상 가능
DROP POLICY IF EXISTS "Poll responses deletable by owner or admin" ON poll_responses;
CREATE POLICY "Poll responses deletable by owner or admin"
  ON poll_responses FOR DELETE TO authenticated
  USING (
    (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM polls p
        WHERE p.id = poll_responses.poll_id
          AND p.is_deleted = false
          AND p.is_closed = false
          AND (p.deadline_at IS NULL OR p.deadline_at > now())
      )
    )
    OR public.has_role(ARRAY['ADMIN'])
  );

-- =============================================
-- 6. 선택형 응답 중복 방지
-- 같은 사용자가 같은 선택지에 두 번 투표하는 것을 차단
-- (단일 선택 강제는 API 레벨에서 delete-then-insert로 처리)
-- =============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_responses_unique_option
  ON poll_responses(poll_id, user_id, selected_option_id)
  WHERE selected_option_id IS NOT NULL;
