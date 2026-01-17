-- 지휘자/반주자 시스템 처리를 위한 is_singer 컬럼 추가
-- is_singer: 자리배치/출석체크 대상 여부
-- true = 일반 대원 (등단), false = 지휘자/반주자 등 비등단 구성원

-- 1. members 테이블에 is_singer 컬럼 추가
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_singer BOOLEAN NOT NULL DEFAULT true;

-- 2. 컬럼 설명 추가
COMMENT ON COLUMN members.is_singer IS '자리배치/출석체크 대상 여부. false=지휘자,반주자 등 비등단 구성원';

-- 3. 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_members_is_singer ON members(is_singer);

-- 4. members_public 뷰 업데이트 (is_singer 포함)
-- CASCADE로 members_with_attendance도 삭제됨
DROP VIEW IF EXISTS members_public CASCADE;

CREATE VIEW members_public AS
SELECT
  id,
  name,
  part,
  height_cm,
  regular_member_since,
  is_leader,
  is_singer,
  member_status,
  phone_number,
  email,
  notes,
  created_at,
  updated_at
FROM members;

-- 5. View에 RLS 적용
ALTER VIEW members_public SET (security_invoker = on);

-- 6. members_with_attendance 뷰 재생성
CREATE OR REPLACE VIEW members_with_attendance AS
SELECT
  mp.*,
  mla.last_service_date,
  mla.last_practice_date
FROM members_public mp
LEFT JOIN member_last_attendance mla ON mp.id = mla.member_id;

-- 7. View에 대한 SELECT 권한 부여
GRANT SELECT ON members_with_attendance TO authenticated;

-- 사용 예시:
-- 출석체크/자리배치 대상 조회: WHERE member_status = 'REGULAR' AND is_singer = true
-- 지휘자/반주자 포함 전체 정대원: WHERE member_status = 'REGULAR'
