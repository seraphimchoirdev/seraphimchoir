-- 대원 연결(Member Linking) 시스템
-- 카카오 로그인 사용자와 기존 members 테이블 연결

-- 1. user_profiles 테이블 확장
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS linked_member_id UUID REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS link_status TEXT DEFAULT NULL;
-- link_status: NULL (연결 안함), 'pending' (승인 대기), 'approved' (승인됨), 'rejected' (거부됨)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS link_requested_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS link_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS link_approved_at TIMESTAMPTZ;

-- 2. 인덱스 추가 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_user_profiles_linked_member_id ON user_profiles(linked_member_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_link_status ON user_profiles(link_status);

-- 3. 연결된 member_id 조회 헬퍼 함수 (RLS용)
CREATE OR REPLACE FUNCTION public.get_linked_member_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT linked_member_id
    FROM public.user_profiles
    WHERE id = auth.uid() AND link_status = 'approved'
  );
END;
$$;

-- 4. 연결 상태 확인 헬퍼 함수
CREATE OR REPLACE FUNCTION public.is_member_linked()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND linked_member_id IS NOT NULL
      AND link_status = 'approved'
  );
END;
$$;

-- 5. 함수 권한 부여
GRANT EXECUTE ON FUNCTION public.get_linked_member_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_linked() TO authenticated;

-- 6. 개인 출석 수정 RLS 정책 추가
-- 기존 정책과 병행: 파트장 이상은 모두 수정 가능, 일반 대원은 본인만 수정 가능
DROP POLICY IF EXISTS "Members can update own attendance" ON attendances;

CREATE POLICY "Members can update own attendance"
  ON attendances FOR UPDATE
  TO authenticated
  USING (
    -- 파트장 이상이거나, 연결된 본인 출석인 경우
    public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER'])
    OR member_id = public.get_linked_member_id()
  )
  WITH CHECK (
    public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER'])
    OR member_id = public.get_linked_member_id()
  );

-- 7. 개인 출석 생성 RLS 정책 추가 (본인 출석 레코드 생성)
DROP POLICY IF EXISTS "Members can insert own attendance" ON attendances;

CREATE POLICY "Members can insert own attendance"
  ON attendances FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER'])
    OR member_id = public.get_linked_member_id()
  );

-- 8. user_profiles 본인 연결 요청 정책 추가
DROP POLICY IF EXISTS "Users can request member link" ON user_profiles;

CREATE POLICY "Users can request member link"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 주석:
-- - linked_member_id: 연결된 찬양대원 ID (members.id 참조)
-- - link_status: 연결 상태 (pending → approved/rejected)
-- - 파트장/관리자가 승인하면 link_status = 'approved'로 변경
-- - 승인된 사용자는 본인 출석만 수정 가능
