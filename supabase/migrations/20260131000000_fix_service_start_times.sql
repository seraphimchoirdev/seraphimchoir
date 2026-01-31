-- 주일 2부 예배 시작 시간 수정: 11:00 → 09:00
-- 새문안교회 2부 예배는 오전 9시 시작
-- 원인: 20260106000000_add_arrangement_status.sql에서 2부 예배를 11:00으로 잘못 매핑
UPDATE service_schedules
SET service_start_time = '09:00'::TIME
WHERE service_type LIKE '%2부%'
  AND service_start_time = '11:00'::TIME;
