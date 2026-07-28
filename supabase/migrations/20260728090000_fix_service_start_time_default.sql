-- 예배 시작 시간이 전부 14:00으로 저장되는 버그 수정
--
-- 배경:
--   20260106000000_add_arrangement_status.sql 에서 service_start_time 컬럼을
--   `TIME DEFAULT '14:00'` 으로 추가한 뒤, 같은 마이그레이션과 후속 두 개
--   (20260131000000, 20260207000000)가 기존 행만 UPDATE로 보정했다.
--   그러나 컬럼 DEFAULT 자체는 한 번도 제거되지 않아, 이후 생성되는 모든
--   일정이 14:00을 물려받는 버그가 반복됐다(2026-08-02 일정이 그 사례).
--
--   또한 폼과 API zod 스키마에 service_start_time이 없어 값을 지정할 방법도
--   없었다. 이 부분은 애플리케이션 코드에서 함께 수정한다.

-- 1) 재발 원인 제거: 하드코딩된 컬럼 DEFAULT 삭제
--    이제 값을 명시하지 않으면 NULL이 되어 누락이 드러난다.
ALTER TABLE service_schedules
  ALTER COLUMN service_start_time DROP DEFAULT;

-- 2) 기존에 잘못 저장된 데이터 보정
--    WHERE 조건으로 14:00인 행만 대상으로 삼아,
--    이미 올바르게 저장된 시간을 패턴 매칭으로 덮어쓰지 않도록 한다.
UPDATE service_schedules
SET service_start_time = CASE
  WHEN service_type LIKE '%2부%'    THEN '09:00'::TIME
  WHEN service_type LIKE '%오후%'   THEN '17:00'::TIME
  WHEN service_type LIKE '%절기%'   THEN '17:00'::TIME
  WHEN service_type LIKE '%찬양%'   THEN '17:00'::TIME
  WHEN service_type LIKE '%기도회%' THEN '19:30'::TIME
  ELSE service_start_time
END
WHERE service_start_time = '14:00'::TIME;

COMMENT ON COLUMN service_schedules.service_start_time IS
  '예배 시작 시간 (자동 확정 기준). 기본값은 앱의 src/lib/service-time.ts에서 예배 종류별로 결정한다.';
