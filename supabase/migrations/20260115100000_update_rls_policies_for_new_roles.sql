-- =============================================
-- RLS 정책 업데이트: 새로운 역할 체계 반영
-- =============================================
--
-- 역할 체계:
-- - ADMIN: 모든 권한
-- - CONDUCTOR: 자리배치 편집, 대원 관리, 출석 관리
-- - MANAGER: 대원 관리, 출석 관리, 문서 관리, 긴급 자리배치 편집 (SHARED 상태만)
-- - STAFF: 문서 조회, 자리배치 조회
-- - PART_LEADER: 자기 파트 출석 관리, 자리배치 조회
-- - MEMBER: 본인 출석만, 자리배치 조회
--

-- =============================================
-- 1. 헬퍼 함수 추가
-- =============================================

-- 현재 사용자와 연결된 대원 ID 조회
CREATE OR REPLACE FUNCTION public.get_linked_member_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT linked_member_id
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND link_status = 'approved'
  );
END;
$$;

-- 현재 사용자와 연결된 대원의 파트 조회 (part ENUM 타입으로 반환)
CREATE OR REPLACE FUNCTION public.get_linked_member_part()
RETURNS part
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT m.part
    FROM public.user_profiles up
    JOIN public.members m ON m.id = up.linked_member_id
    WHERE up.id = auth.uid()
      AND up.link_status = 'approved'
  );
END;
$$;

-- 배치표의 상태 조회 (seats 정책에서 사용)
CREATE OR REPLACE FUNCTION public.get_arrangement_status(arrangement_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT status
    FROM public.arrangements
    WHERE id = arrangement_id
  );
END;
$$;

-- 권한 함수에 GRANT
GRANT EXECUTE ON FUNCTION public.get_linked_member_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_linked_member_part() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_arrangement_status(UUID) TO authenticated;

-- =============================================
-- 2. members 테이블 RLS 정책
-- =============================================
-- SELECT: 모든 인증된 사용자 (MEMBER, STAFF 포함)
-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR, MANAGER, PART_LEADER

DROP POLICY IF EXISTS "Members are editable by part leaders and above" ON members;
DROP POLICY IF EXISTS "Members are viewable by all authenticated" ON members;
DROP POLICY IF EXISTS "Members are editable by managers and above" ON members;

-- SELECT: 모든 인증된 사용자
CREATE POLICY "Members are viewable by all authenticated"
  ON members FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR, MANAGER만 (PART_LEADER는 대원 추가/삭제 불가)
CREATE POLICY "Members are editable by managers and above"
  ON members FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']));

-- =============================================
-- 3. attendances 테이블 RLS 정책
-- =============================================
-- ADMIN, CONDUCTOR, MANAGER: 모든 출석 관리
-- PART_LEADER: 자기 파트 출석만 관리
-- MEMBER: 본인 출석만 조회/수정

DROP POLICY IF EXISTS "Attendances are editable by part leaders and above" ON attendances;
DROP POLICY IF EXISTS "Attendances viewable by all authenticated" ON attendances;
DROP POLICY IF EXISTS "Attendances editable by managers" ON attendances;
DROP POLICY IF EXISTS "Attendances editable by part leaders for their part" ON attendances;
DROP POLICY IF EXISTS "Attendances editable by member for self" ON attendances;

-- SELECT: 모든 인증된 사용자 (대시보드 통계 등에 필요)
CREATE POLICY "Attendances viewable by all authenticated"
  ON attendances FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR, MANAGER (모든 출석)
CREATE POLICY "Attendances editable by managers"
  ON attendances FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']));

-- INSERT/UPDATE/DELETE: PART_LEADER (자기 파트만)
CREATE POLICY "Attendances editable by part leaders for their part"
  ON attendances FOR ALL
  TO authenticated
  USING (
    public.get_user_role() = 'PART_LEADER'
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = attendances.member_id
        AND m.part = public.get_linked_member_part()
    )
  )
  WITH CHECK (
    public.get_user_role() = 'PART_LEADER'
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = attendances.member_id
        AND m.part = public.get_linked_member_part()
    )
  );

-- INSERT/UPDATE/DELETE: MEMBER (본인 출석만)
CREATE POLICY "Attendances editable by member for self"
  ON attendances FOR ALL
  TO authenticated
  USING (
    public.get_user_role() = 'MEMBER'
    AND member_id = public.get_linked_member_id()
  )
  WITH CHECK (
    public.get_user_role() = 'MEMBER'
    AND member_id = public.get_linked_member_id()
  );

-- =============================================
-- 4. arrangements 테이블 RLS 정책
-- =============================================
-- SELECT: 모든 인증된 사용자
-- INSERT/DELETE: ADMIN, CONDUCTOR
-- UPDATE: ADMIN, CONDUCTOR (모든 상태) / MANAGER (SHARED 상태만)

DROP POLICY IF EXISTS "Arrangements are editable by conductors and above" ON arrangements;
DROP POLICY IF EXISTS "Arrangements viewable by all authenticated" ON arrangements;
DROP POLICY IF EXISTS "Arrangements creatable by conductors" ON arrangements;
DROP POLICY IF EXISTS "Arrangements updatable by conductors" ON arrangements;
DROP POLICY IF EXISTS "Arrangements updatable by managers when shared" ON arrangements;
DROP POLICY IF EXISTS "Arrangements deletable by conductors" ON arrangements;

-- SELECT: 모든 인증된 사용자
CREATE POLICY "Arrangements viewable by all authenticated"
  ON arrangements FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: ADMIN, CONDUCTOR
CREATE POLICY "Arrangements creatable by conductors"
  ON arrangements FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']));

-- UPDATE: ADMIN, CONDUCTOR (모든 상태)
CREATE POLICY "Arrangements updatable by conductors"
  ON arrangements FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']));

-- UPDATE: MANAGER (SHARED 상태일 때만 긴급 수정)
CREATE POLICY "Arrangements updatable by managers when shared"
  ON arrangements FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() = 'MANAGER'
    AND status = 'SHARED'
  )
  WITH CHECK (
    public.get_user_role() = 'MANAGER'
    AND status = 'SHARED'
  );

-- DELETE: ADMIN, CONDUCTOR
CREATE POLICY "Arrangements deletable by conductors"
  ON arrangements FOR DELETE
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']));

-- =============================================
-- 5. seats 테이블 RLS 정책
-- =============================================
-- SELECT: 모든 인증된 사용자
-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR (모든 상태) / MANAGER (SHARED 상태만)

DROP POLICY IF EXISTS "Seats are editable by conductors and above" ON seats;
DROP POLICY IF EXISTS "Seats viewable by all authenticated" ON seats;
DROP POLICY IF EXISTS "Seats editable by conductors" ON seats;
DROP POLICY IF EXISTS "Seats editable by managers when shared" ON seats;

-- SELECT: 모든 인증된 사용자
CREATE POLICY "Seats viewable by all authenticated"
  ON seats FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR
CREATE POLICY "Seats editable by conductors"
  ON seats FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']));

-- INSERT/UPDATE/DELETE: MANAGER (배치표가 SHARED 상태일 때만)
CREATE POLICY "Seats editable by managers when shared"
  ON seats FOR ALL
  TO authenticated
  USING (
    public.get_user_role() = 'MANAGER'
    AND public.get_arrangement_status(arrangement_id) = 'SHARED'
  )
  WITH CHECK (
    public.get_user_role() = 'MANAGER'
    AND public.get_arrangement_status(arrangement_id) = 'SHARED'
  );

-- =============================================
-- 6. documents 테이블 RLS 정책
-- =============================================
-- SELECT: ADMIN, CONDUCTOR, MANAGER, STAFF
-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR, MANAGER

DROP POLICY IF EXISTS "Documents are viewable by managers" ON documents;
DROP POLICY IF EXISTS "Documents are manageable by managers" ON documents;
DROP POLICY IF EXISTS "Documents viewable by staff and above" ON documents;
DROP POLICY IF EXISTS "Documents manageable by managers" ON documents;

-- SELECT: ADMIN, CONDUCTOR, MANAGER, STAFF
CREATE POLICY "Documents viewable by staff and above"
  ON documents FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'STAFF']));

-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR, MANAGER
CREATE POLICY "Documents manageable by managers"
  ON documents FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']));

-- =============================================
-- 7. service_schedules 테이블 RLS 정책 (예배 일정)
-- =============================================
-- SELECT: 모든 인증된 사용자
-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR, MANAGER

DROP POLICY IF EXISTS "Service schedules viewable by all" ON service_schedules;
DROP POLICY IF EXISTS "Service schedules manageable by managers" ON service_schedules;

-- SELECT: 모든 인증된 사용자
CREATE POLICY "Service schedules viewable by all"
  ON service_schedules FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR, MANAGER
CREATE POLICY "Service schedules manageable by managers"
  ON service_schedules FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']));

-- =============================================
-- 8. choir_events 테이블 RLS 정책 (찬양대 행사)
-- =============================================
-- SELECT: 모든 인증된 사용자
-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR, MANAGER

DROP POLICY IF EXISTS "Choir events viewable by all" ON choir_events;
DROP POLICY IF EXISTS "Choir events manageable by managers" ON choir_events;

-- SELECT: 모든 인증된 사용자
CREATE POLICY "Choir events viewable by all"
  ON choir_events FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR, MANAGER
CREATE POLICY "Choir events manageable by managers"
  ON choir_events FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']));

-- =============================================
-- 9. attendance_deadlines 테이블 RLS 정책 (출석 마감)
-- =============================================
-- SELECT: 모든 인증된 사용자
-- INSERT: ADMIN, CONDUCTOR, MANAGER, PART_LEADER
-- DELETE: ADMIN, CONDUCTOR

DROP POLICY IF EXISTS "attendance_deadlines_select_policy" ON attendance_deadlines;
DROP POLICY IF EXISTS "attendance_deadlines_insert_policy" ON attendance_deadlines;
DROP POLICY IF EXISTS "attendance_deadlines_delete_policy" ON attendance_deadlines;

-- SELECT: 모든 인증된 사용자
CREATE POLICY "attendance_deadlines_select_policy"
  ON attendance_deadlines FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: ADMIN, CONDUCTOR, MANAGER, PART_LEADER
CREATE POLICY "attendance_deadlines_insert_policy"
  ON attendance_deadlines FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']));

-- DELETE: ADMIN, CONDUCTOR
CREATE POLICY "attendance_deadlines_delete_policy"
  ON attendance_deadlines FOR DELETE
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']));

-- =============================================
-- 10. attendance_vote_deadlines 테이블 RLS 정책
-- =============================================
-- SELECT: 모든 인증된 사용자
-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR, MANAGER, PART_LEADER

DROP POLICY IF EXISTS "Vote deadlines are viewable by all authenticated" ON attendance_vote_deadlines;
DROP POLICY IF EXISTS "Vote deadlines are manageable by managers" ON attendance_vote_deadlines;

-- SELECT: 모든 인증된 사용자
CREATE POLICY "Vote deadlines are viewable by all authenticated"
  ON attendance_vote_deadlines FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: ADMIN, CONDUCTOR, MANAGER, PART_LEADER
CREATE POLICY "Vote deadlines are manageable by managers"
  ON attendance_vote_deadlines FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']));

-- =============================================
-- 11. ML 학습 테이블 RLS 정책 (has_role 함수 사용으로 업데이트)
-- =============================================

-- member_seat_statistics
DROP POLICY IF EXISTS "Statistics are viewable by authenticated users" ON member_seat_statistics;
DROP POLICY IF EXISTS "Statistics are editable by conductors and above" ON member_seat_statistics;

CREATE POLICY "Statistics are viewable by authenticated users"
  ON member_seat_statistics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Statistics are editable by conductors and above"
  ON member_seat_statistics FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']));

-- row_distribution_patterns
DROP POLICY IF EXISTS "Patterns are viewable by authenticated users" ON row_distribution_patterns;
DROP POLICY IF EXISTS "Patterns are editable by conductors and above" ON row_distribution_patterns;

CREATE POLICY "Patterns are viewable by authenticated users"
  ON row_distribution_patterns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Patterns are editable by conductors and above"
  ON row_distribution_patterns FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']));

-- ml_arrangement_history
DROP POLICY IF EXISTS "History is viewable by authenticated users" ON ml_arrangement_history;
DROP POLICY IF EXISTS "History is editable by conductors and above" ON ml_arrangement_history;

CREATE POLICY "History is viewable by authenticated users"
  ON ml_arrangement_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "History is editable by conductors and above"
  ON ml_arrangement_history FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']));

-- learned_part_placement_rules
DROP POLICY IF EXISTS "learned_part_placement_rules_select" ON learned_part_placement_rules;
DROP POLICY IF EXISTS "learned_part_placement_rules_all" ON learned_part_placement_rules;

CREATE POLICY "learned_part_placement_rules_select"
  ON learned_part_placement_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "learned_part_placement_rules_all"
  ON learned_part_placement_rules FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']));

-- =============================================
-- 정책 설명
-- =============================================
--
-- members: 모든 인증 사용자가 조회 가능, MANAGER 이상만 편집
-- attendances:
--   - 모든 인증 사용자가 조회 가능 (대시보드 통계용)
--   - MANAGER 이상: 모든 출석 편집 가능
--   - PART_LEADER: 자기 파트 출석만 편집 가능
--   - MEMBER: 본인 출석만 편집 가능
-- arrangements:
--   - 모든 인증 사용자가 조회 가능
--   - CONDUCTOR 이상: 생성/수정/삭제 가능
--   - MANAGER: SHARED 상태일 때만 수정 가능 (긴급 수정)
-- seats:
--   - 모든 인증 사용자가 조회 가능
--   - CONDUCTOR 이상: 모든 좌석 편집 가능
--   - MANAGER: 배치표가 SHARED 상태일 때만 편집 가능
-- documents:
--   - STAFF 이상만 조회 가능
--   - MANAGER 이상만 편집 가능
-- service_schedules, choir_events:
--   - 모든 인증 사용자가 조회 가능
--   - MANAGER 이상만 편집 가능
-- attendance_deadlines:
--   - 모든 인증 사용자가 조회 가능
--   - PART_LEADER 이상이 생성 가능
--   - CONDUCTOR 이상만 삭제 가능
-- attendance_vote_deadlines:
--   - 모든 인증 사용자가 조회 가능
--   - PART_LEADER 이상만 관리 가능
-- ML 학습 테이블들:
--   - 모든 인증 사용자가 조회 가능
--   - CONDUCTOR 이상만 수정 가능
--
