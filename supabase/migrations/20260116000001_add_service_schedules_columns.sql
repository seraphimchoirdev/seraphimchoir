-- service_schedules 테이블 추가 컬럼
ALTER TABLE service_schedules ADD COLUMN IF NOT EXISTS post_practice_location TEXT;
ALTER TABLE service_schedules ADD COLUMN IF NOT EXISTS pre_practice_location TEXT;

COMMENT ON COLUMN service_schedules.post_practice_location IS '후연습 장소';
COMMENT ON COLUMN service_schedules.pre_practice_location IS '사전연습 장소';
