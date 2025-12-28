-- 찬양대원 자격 상태 추가
-- Add member status field to distinguish member qualifications

-- Member Status ENUM 타입 생성
-- REGULAR: 정대원 (예배 참여 가능)
-- NEW: 신입대원 (연습만 참여, 2-4주 후 정대원 승격)
-- ON_LEAVE: 휴직대원 (일시적으로 활동 중단)
-- RESIGNED: 사직대원 (활동 종료)
CREATE TYPE member_status AS ENUM ('REGULAR', 'NEW', 'ON_LEAVE', 'RESIGNED');

-- members 테이블에 member_status 컬럼 추가
ALTER TABLE members
ADD COLUMN member_status member_status NOT NULL DEFAULT 'NEW';

-- 기존 대원들은 모두 정대원으로 설정 (이미 활동 중인 대원들)
UPDATE members SET member_status = 'REGULAR' WHERE member_status = 'NEW';

-- 인덱스 생성 (자격별 조회 성능 최적화)
CREATE INDEX idx_members_status ON members(member_status);

-- members_public View 업데이트 (member_status 포함)
DROP VIEW IF EXISTS members_public;
CREATE VIEW members_public AS
SELECT
  id,
  name,
  part,
  height,
  experience,
  is_leader,
  member_status,
  phone_number,
  email,
  notes,  -- 일반 특이사항만 포함
  created_at,
  updated_at
FROM members;

-- View에도 RLS 적용
ALTER VIEW members_public SET (security_invoker = on);

-- 주석:
-- 예배 출석 가능 여부 조회 시 member_status = 'REGULAR'인 대원만 조회해야 함
-- 신입대원(NEW)은 연습에는 참여하지만 예배에는 참여할 수 없음
-- 2-4주 후 지휘자 또는 관리자가 수동으로 'REGULAR'로 승격
