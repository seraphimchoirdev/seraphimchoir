-- Rename is_available to is_service_available and add is_practice_attended
ALTER TABLE attendances 
RENAME COLUMN is_available TO is_service_available;

ALTER TABLE attendances 
ADD COLUMN is_practice_attended BOOLEAN NOT NULL DEFAULT true;

-- Update comments
COMMENT ON COLUMN attendances.is_service_available IS '주일 예배 등단 가능 여부';
COMMENT ON COLUMN attendances.is_practice_attended IS '예배 후 연습 참석 여부';
