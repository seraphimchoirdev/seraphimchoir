-- 긴급 수정 기능을 위한 3단계 상태 시스템 마이그레이션
-- DRAFT: 작성중 (전체 편집 가능)
-- SHARED: 공유됨 (긴급 수정 가능)
-- CONFIRMED: 확정됨 (읽기 전용)

-- 1. arrangements 테이블에 status 필드 추가
ALTER TABLE arrangements
ADD COLUMN IF NOT EXISTS status TEXT CHECK(status IN ('DRAFT', 'SHARED', 'CONFIRMED')) DEFAULT 'DRAFT';

-- 2. 기존 데이터 마이그레이션 (is_published 기반)
UPDATE arrangements
SET status = CASE
  WHEN is_published = true THEN 'CONFIRMED'
  ELSE 'DRAFT'
END
WHERE status IS NULL OR status = 'DRAFT';

-- 3. service_schedules에 예배 시작 시간 추가
ALTER TABLE service_schedules
ADD COLUMN IF NOT EXISTS service_start_time TIME DEFAULT '14:00';

-- 4. 예배 유형별 기본 시작 시간 설정
UPDATE service_schedules
SET service_start_time = CASE
  WHEN service_type LIKE '%1부%' THEN '09:00'::TIME
  WHEN service_type LIKE '%2부%' THEN '11:00'::TIME
  WHEN service_type LIKE '%오후%' OR service_type LIKE '%찬양%' THEN '14:00'::TIME
  WHEN service_type LIKE '%수요%' THEN '19:30'::TIME
  WHEN service_type LIKE '%금요%' THEN '20:00'::TIME
  ELSE '11:00'::TIME
END
WHERE service_start_time IS NULL OR service_start_time = '14:00'::TIME;

-- 5. 인덱스 추가 (상태별 조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_arrangements_status ON arrangements(status);
CREATE INDEX IF NOT EXISTS idx_arrangements_date_status ON arrangements(date, status);

COMMENT ON COLUMN arrangements.status IS '배치표 상태: DRAFT(작성중), SHARED(공유됨-긴급수정가능), CONFIRMED(확정됨-읽기전용)';
COMMENT ON COLUMN service_schedules.service_start_time IS '예배 시작 시간 (자동 확정 기준)';
