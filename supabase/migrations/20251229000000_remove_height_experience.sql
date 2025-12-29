-- 찬양대원 테이블에서 키(height)와 경력(experience) 컬럼 삭제
-- 더 이상 사용하지 않는 필드 정리

-- 1. members_public 뷰 삭제 (컬럼 의존성 때문에 먼저 삭제해야 함)
DROP VIEW IF EXISTS members_public;

-- 2. members 테이블에서 height, experience 컬럼 삭제
ALTER TABLE members DROP COLUMN IF EXISTS height;
ALTER TABLE members DROP COLUMN IF EXISTS experience;

-- 3. members_public 뷰 재생성 (height, experience 제외)
CREATE VIEW members_public AS
SELECT
  id,
  name,
  part,
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

-- 주석: 암호화된 지휘자 메모 필드는 여전히 members 테이블에만 존재
-- encrypted_conductor_notes, conductor_notes_iv, conductor_notes_auth_tag
