-- 마이그레이션: service_schedules 테이블에 연습 정보 필드 추가
-- 연습은 예배에 종속되므로 별도 테이블 대신 기존 테이블 확장

-- 예배 후 연습 (일반 예배용: 매주 일요일 2부 예배 후 10:30~)
ALTER TABLE service_schedules
  ADD COLUMN IF NOT EXISTS has_post_practice BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS post_practice_start_time TIME DEFAULT '10:30',
  ADD COLUMN IF NOT EXISTS post_practice_duration INTEGER DEFAULT 60;

-- 예배 전 연습 (특별예배용: 시작 40분~1시간 전)
ALTER TABLE service_schedules
  ADD COLUMN IF NOT EXISTS has_pre_practice BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_practice_minutes_before INTEGER DEFAULT 60;

-- 연습 장소 (선택적)
ALTER TABLE service_schedules
  ADD COLUMN IF NOT EXISTS practice_location TEXT;

-- 코멘트 추가
COMMENT ON COLUMN service_schedules.has_post_practice IS '예배 후 연습 여부 (일반 예배: true, 특별예배: false)';
COMMENT ON COLUMN service_schedules.post_practice_start_time IS '예배 후 연습 시작 시간 (기본: 10:30)';
COMMENT ON COLUMN service_schedules.post_practice_duration IS '예배 후 연습 소요 시간 (분, 기본: 60)';
COMMENT ON COLUMN service_schedules.has_pre_practice IS '예배 전 연습 여부 (특별예배용)';
COMMENT ON COLUMN service_schedules.pre_practice_minutes_before IS '예배 시작 몇 분 전에 연습하는지 (기본: 60)';
COMMENT ON COLUMN service_schedules.practice_location IS '연습 장소';
