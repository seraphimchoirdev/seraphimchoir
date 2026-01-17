-- 찬양대원 테이블에 키(height_cm)와 정대원 임명일(regular_member_since) 컬럼 추가
-- height_cm: AI 자리배치에 활용될 키 정보 (cm 단위)
-- regular_member_since: 정대원 임명일 (선택 입력)

-- 1. members 테이블에 새 컬럼 추가
ALTER TABLE members ADD COLUMN IF NOT EXISTS height_cm INTEGER;
ALTER TABLE members ADD COLUMN IF NOT EXISTS regular_member_since DATE;

-- 2. 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN members.height_cm IS '찬양대원 키 (cm), AI 자리배치에 활용';
COMMENT ON COLUMN members.regular_member_since IS '정대원 임명일';

-- 3. members_public 뷰 업데이트 (height_cm, regular_member_since 포함)
DROP VIEW IF EXISTS members_public CASCADE;

CREATE VIEW members_public AS
SELECT
  id,
  name,
  part,
  height_cm,
  regular_member_since,
  is_leader,
  member_status,
  phone_number,
  email,
  notes,
  created_at,
  updated_at
FROM members;

-- 4. View에 RLS 적용
ALTER VIEW members_public SET (security_invoker = on);
