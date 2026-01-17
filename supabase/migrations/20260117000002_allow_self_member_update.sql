-- 본인이 연결된 대원 정보(키, 정대원 임명일)를 수정할 수 있도록 RLS 정책 추가
-- MEMBER 역할 사용자가 마이페이지에서 본인 정보를 수정할 수 있도록 함

-- 본인 연결된 대원 정보 수정 허용 정책
CREATE POLICY "Members can update own linked profile"
ON members
FOR UPDATE
TO authenticated
USING (
  -- 본인이 연결된 대원인지 확인
  id IN (
    SELECT linked_member_id
    FROM user_profiles
    WHERE id = auth.uid()
    AND link_status = 'approved'
  )
)
WITH CHECK (
  id IN (
    SELECT linked_member_id
    FROM user_profiles
    WHERE id = auth.uid()
    AND link_status = 'approved'
  )
);

-- 정책 설명 추가
COMMENT ON POLICY "Members can update own linked profile" ON members IS
  '승인된 대원 연결 사용자가 본인의 키, 정대원 임명일 등을 수정할 수 있도록 허용';
