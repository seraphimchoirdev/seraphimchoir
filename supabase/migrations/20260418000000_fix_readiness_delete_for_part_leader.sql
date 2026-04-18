-- 준비완료 삭제 정책 수정:
-- 이전: PART_LEADER는 본인이 마크한(closed_by) 레코드만 삭제 가능
-- 변경: PART_LEADER는 자기 파트의 레코드면 누가 마크했든 삭제 가능
-- 사유: 지휘자/관리자가 마크한 준비완료를 파트장이 해제할 수 없던 버그 수정

DROP POLICY IF EXISTS "attendance_deadlines_delete_policy" ON attendance_deadlines;

CREATE POLICY "attendance_deadlines_delete_policy"
  ON attendance_deadlines FOR DELETE
  TO authenticated
  USING (
    -- ADMIN/CONDUCTOR: 모든 레코드 삭제 가능
    public.has_role(ARRAY['ADMIN', 'CONDUCTOR'])
    OR (
      -- PART_LEADER: 자기 파트의 레코드면 삭제 가능 (마크 주체 무관)
      public.has_role(ARRAY['PART_LEADER'])
      AND part = public.get_linked_member_part()
    )
  );
