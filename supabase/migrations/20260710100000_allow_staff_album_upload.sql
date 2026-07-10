-- =============================================
-- linked_member 없는 운영진의 앨범/사진 업로드 허용
--
-- 문제: 앱 레벨 체크(canParticipateInCommunity)는 운영진을 통과시키지만
--   RLS가 is_member_linked()를 요구해 실제 INSERT는 500으로 실패
--   (업로드 버튼은 보이는데 누를 때마다 실패)
-- 결정: 허용 — 운영진이 행사 사진을 대신 올려주는 운영 시나리오에 부합
--   (반응/댓글/투표 INSERT의 is_member_linked() 요구는 현행 유지)
-- =============================================

-- 사진 업로드: 연결된 대원 또는 운영진
DROP POLICY IF EXISTS "Album photos insertable by linked members" ON album_photos;
DROP POLICY IF EXISTS "Album photos insertable by linked members or staff" ON album_photos;
CREATE POLICY "Album photos insertable by linked members or staff"
  ON album_photos FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      public.is_member_linked()
      OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY', 'TREASURER', 'PART_LEADER'])
    )
  );

-- 앨범 생성: 역할 요구는 유지하되 is_member_linked() 중복 요구 제거
-- (퀵 업로드가 월별 앨범을 자동 생성하므로 linked 없는 운영진도 필요)
DROP POLICY IF EXISTS "Albums insertable by leaders" ON photo_albums;
CREATE POLICY "Albums insertable by leaders"
  ON photo_albums FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY', 'TREASURER', 'PART_LEADER'])
  );
