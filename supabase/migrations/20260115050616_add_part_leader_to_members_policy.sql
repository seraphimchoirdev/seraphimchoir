-- =============================================
-- PART_LEADER에게 대원 등록/수정 권한 부여
-- =============================================
-- 기존: ADMIN, CONDUCTOR, MANAGER만 INSERT/UPDATE/DELETE
-- 변경: ADMIN, CONDUCTOR, MANAGER, PART_LEADER도 INSERT/UPDATE 가능
--       (DELETE는 여전히 ADMIN, CONDUCTOR, MANAGER만 가능)

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Members are editable by managers and above" ON members;

-- INSERT: ADMIN, CONDUCTOR, MANAGER, PART_LEADER
CREATE POLICY "Members insertable by part leaders and above"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']));

-- UPDATE: ADMIN, CONDUCTOR, MANAGER, PART_LEADER
CREATE POLICY "Members updatable by part leaders and above"
  ON members FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']));

-- DELETE: ADMIN, CONDUCTOR, MANAGER만 (PART_LEADER는 삭제 불가)
CREATE POLICY "Members deletable by managers and above"
  ON members FOR DELETE
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']));
