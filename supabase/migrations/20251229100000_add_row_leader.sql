-- 좌석 테이블에 줄반장 표시 컬럼 추가
-- 각 행에서 수동으로 지정된 줄반장을 표시하기 위한 필드

ALTER TABLE seats ADD COLUMN is_row_leader BOOLEAN DEFAULT FALSE;

-- 인덱스 추가 (줄반장 조회 최적화)
CREATE INDEX idx_seats_row_leader ON seats(arrangement_id, is_row_leader) WHERE is_row_leader = TRUE;

COMMENT ON COLUMN seats.is_row_leader IS '줄반장 여부 - 예배당 입구에서 줄 설 때 맨 앞에 서는 대원';
