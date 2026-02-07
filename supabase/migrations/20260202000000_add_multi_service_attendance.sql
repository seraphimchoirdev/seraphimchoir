-- 예배별 개별 출석 체크 (Multi-Service Attendance)
-- 같은 날짜에 여러 예배(주일 2부, 오후찬양예배 등)가 있을 때 각 예배별 독립 출석 관리
--
-- 변경사항:
-- 1) attendances에 service_schedule_id FK 추가
-- 2) 기존 데이터 백필 (date 기준 매칭)
-- 3) UNIQUE 제약 변경: (member_id, date) → (member_id, service_schedule_id)
-- 4) arrangements에 service_schedule_id FK 추가
-- 5) 기존 arrangements 백필

-- 1) attendances에 service_schedule_id FK 추가
ALTER TABLE attendances
  ADD COLUMN service_schedule_id UUID REFERENCES service_schedules(id) ON DELETE SET NULL;

-- 2) 기존 attendances 데이터 백필: date로 매칭되는 service_schedule 연결
-- 같은 날짜에 여러 schedule이 있을 수 있으므로 '주일 2부 예배'를 우선 매칭
UPDATE attendances a
SET service_schedule_id = ss.id
FROM service_schedules ss
WHERE a.date = ss.date
  AND ss.service_type = '주일 2부 예배'
  AND a.service_schedule_id IS NULL;

-- 날짜에 '주일 2부 예배'가 없는 경우, 해당 날짜의 첫 번째 schedule로 매칭
UPDATE attendances a
SET service_schedule_id = (
  SELECT ss.id FROM service_schedules ss
  WHERE ss.date = a.date
  ORDER BY ss.created_at ASC
  LIMIT 1
)
WHERE a.service_schedule_id IS NULL
  AND EXISTS (SELECT 1 FROM service_schedules ss WHERE ss.date = a.date);

-- 3) UNIQUE 제약 변경: (member_id, date) → (member_id, service_schedule_id)
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_member_id_date_key;

-- service_schedule_id가 NULL인 레코드는 orphan이므로 unique 제약에서 제외됨 (NULL은 UNIQUE에 참여하지 않음)
ALTER TABLE attendances ADD CONSTRAINT attendances_member_service_key
  UNIQUE (member_id, service_schedule_id);

-- 4) 인덱스
CREATE INDEX IF NOT EXISTS idx_attendances_service_schedule
  ON attendances(service_schedule_id);

-- 5) arrangements에 service_schedule_id FK 추가
ALTER TABLE arrangements
  ADD COLUMN service_schedule_id UUID REFERENCES service_schedules(id) ON DELETE SET NULL;

-- 6) 기존 arrangements 백필: date + service_info 매칭 시도
-- service_info에 service_type이 포함된 경우 매칭
UPDATE arrangements a
SET service_schedule_id = ss.id
FROM service_schedules ss
WHERE a.date = ss.date
  AND a.service_info IS NOT NULL
  AND a.service_info LIKE '%' || ss.service_type || '%'
  AND a.service_schedule_id IS NULL;

-- 매칭 안된 경우 '주일 2부 예배' 우선
UPDATE arrangements a
SET service_schedule_id = ss.id
FROM service_schedules ss
WHERE a.date = ss.date
  AND ss.service_type = '주일 2부 예배'
  AND a.service_schedule_id IS NULL;

-- 그래도 매칭 안된 경우 해당 날짜의 첫 번째 schedule
UPDATE arrangements a
SET service_schedule_id = (
  SELECT ss.id FROM service_schedules ss
  WHERE ss.date = a.date
  ORDER BY ss.created_at ASC
  LIMIT 1
)
WHERE a.service_schedule_id IS NULL
  AND EXISTS (SELECT 1 FROM service_schedules ss WHERE ss.date = a.date);

-- 7) arrangements에 service_schedule_id unique 제약 (하나의 예배에 하나의 배치표)
ALTER TABLE arrangements ADD CONSTRAINT arrangements_service_schedule_key
  UNIQUE (service_schedule_id);

-- 코멘트
COMMENT ON COLUMN attendances.service_schedule_id IS '연결된 예배 일정 ID (예배별 개별 출석)';
COMMENT ON COLUMN arrangements.service_schedule_id IS '연결된 예배 일정 ID (예배별 개별 자리배치)';
