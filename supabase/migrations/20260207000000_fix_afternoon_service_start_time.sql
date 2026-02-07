-- 오후찬양예배 시작 시간 수정: 14:00 → 17:00 (실제 17시 시작)
UPDATE service_schedules
SET service_start_time = '17:00'::TIME
WHERE service_type = '오후찬양예배'
  AND service_start_time = '14:00'::TIME;

-- 찬양대연합예배 시작 시간 수정: 14:00 → 17:00
UPDATE service_schedules
SET service_start_time = '17:00'::TIME
WHERE service_type = '찬양대연합예배'
  AND service_start_time = '14:00'::TIME;
