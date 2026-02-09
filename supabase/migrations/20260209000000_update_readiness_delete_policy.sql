-- 준비 완료(readiness) 시스템으로 전환: PART_LEADER도 본인이 마크한 레코드 삭제 가능
-- 기존: ADMIN/CONDUCTOR만 삭제 가능
-- 변경: ADMIN/CONDUCTOR는 모든 레코드, PART_LEADER는 본인이 생성한(closed_by) 레코드만 삭제 가능

DROP POLICY IF EXISTS "attendance_deadlines_delete_policy" ON attendance_deadlines;

CREATE POLICY "attendance_deadlines_delete_policy"
  ON attendance_deadlines FOR DELETE
  TO authenticated
  USING (
    -- ADMIN/CONDUCTOR: 모든 레코드 삭제 가능
    public.has_role(ARRAY['ADMIN', 'CONDUCTOR'])
    OR (
      -- PART_LEADER: 본인이 생성한 레코드만 삭제 가능
      closed_by = auth.uid()
      AND public.has_role(ARRAY['PART_LEADER'])
    )
  );
