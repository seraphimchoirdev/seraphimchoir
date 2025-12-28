-- 특정 날짜에 여러 예배(주일 대예배, 주일 오후 찬양예배 등)를 위한
-- 여러 개의 자리배치표를 생성할 수 있도록 date UNIQUE 제약조건 제거

-- arrangements 테이블의 date 컬럼에서 UNIQUE 제약조건 제거
ALTER TABLE arrangements DROP CONSTRAINT IF EXISTS arrangements_date_key;

-- 인덱스는 유지 (성능을 위해)
-- CREATE INDEX idx_arrangements_date ON arrangements(date); -- 이미 존재

-- 주석: 이제 같은 날짜에 여러 배치표를 생성할 수 있습니다
-- 예: 2025-11-30 주일 대예배, 2025-11-30 주일 오후 찬양예배
COMMENT ON COLUMN arrangements.date IS '예배 날짜 (같은 날짜에 여러 배치표 가능)';
