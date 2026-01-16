-- 누락된 컬럼 추가 (데이터 이관을 위해)
-- 기존 프로젝트에 있지만 마이그레이션에 누락된 컬럼들

-- ==========================================
-- members 테이블: 누락된 컬럼들 추가
-- ==========================================
ALTER TABLE members
ADD COLUMN IF NOT EXISTS joined_date DATE;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS height INTEGER;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS leave_reason TEXT;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS leave_start_date DATE;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS leave_duration_months INTEGER;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS expected_return_date DATE;

COMMENT ON COLUMN members.joined_date IS '입단일';
COMMENT ON COLUMN members.height IS '키 (cm)';
COMMENT ON COLUMN members.leave_reason IS '휴회 사유';
COMMENT ON COLUMN members.leave_start_date IS '휴회 시작일';
COMMENT ON COLUMN members.leave_duration_months IS '휴회 기간 (개월)';
COMMENT ON COLUMN members.expected_return_date IS '휴회 시 예상 복귀일';

-- ==========================================
-- service_schedules 테이블: 누락된 컬럼들 추가
-- ==========================================
ALTER TABLE service_schedules
ADD COLUMN IF NOT EXISTS hood_color TEXT;

ALTER TABLE service_schedules
ADD COLUMN IF NOT EXISTS composer TEXT;

ALTER TABLE service_schedules
ADD COLUMN IF NOT EXISTS music_source TEXT;

ALTER TABLE service_schedules
ADD COLUMN IF NOT EXISTS pre_practice_start_time TIME;

COMMENT ON COLUMN service_schedules.hood_color IS '가운 후드 색상';
COMMENT ON COLUMN service_schedules.composer IS '찬양 작곡가';
COMMENT ON COLUMN service_schedules.music_source IS '악보 출처';
COMMENT ON COLUMN service_schedules.pre_practice_start_time IS '사전 연습 시작 시간';
