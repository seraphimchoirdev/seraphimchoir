-- Add version column to members table for optimistic locking
-- 낙관적 잠금(Optimistic Locking)을 위한 version 컬럼 추가

-- 1. version 컬럼 추가
ALTER TABLE members
ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- 2. 기존 레코드의 version을 1로 초기화 (이미 DEFAULT로 처리되지만 명시적으로)
UPDATE members SET version = 1 WHERE version IS NULL;

-- 3. version 컬럼에 체크 제약 조건 추가 (음수 방지)
ALTER TABLE members
ADD CONSTRAINT members_version_positive CHECK (version > 0);

-- 4. version 컬럼 인덱스 추가 (조회 성능 향상)
CREATE INDEX idx_members_version ON members(version);

COMMENT ON COLUMN members.version IS '낙관적 잠금을 위한 버전 번호. 업데이트 시마다 1씩 증가';

-- 5. members_public View 업데이트 (version 포함)
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
  updated_at,
  version  -- version 컬럼 추가
FROM members;

-- View에도 RLS 적용
ALTER VIEW members_public SET (security_invoker = on);
