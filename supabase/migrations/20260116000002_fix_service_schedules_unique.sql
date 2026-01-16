-- service_schedules 테이블의 date UNIQUE 제약조건 수정
-- 같은 날짜에 여러 예배(1부, 2부 등)가 있을 수 있으므로
-- date 단독 UNIQUE를 제거하고 (date, service_type) 조합 UNIQUE로 변경

-- 기존 UNIQUE 제약조건 삭제
ALTER TABLE service_schedules DROP CONSTRAINT IF EXISTS service_schedules_date_key;

-- 새로운 UNIQUE 제약조건 추가 (날짜 + 예배유형 조합)
ALTER TABLE service_schedules
ADD CONSTRAINT service_schedules_date_service_type_key UNIQUE(date, service_type);
