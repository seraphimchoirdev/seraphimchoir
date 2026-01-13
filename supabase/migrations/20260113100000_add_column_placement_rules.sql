-- 열(Col) 기반 파트 배치 패턴 학습을 위한 스키마 확장
-- 기존 learned_part_placement_rules 테이블에 열 관련 컬럼 추가

ALTER TABLE learned_part_placement_rules
ADD COLUMN IF NOT EXISTS col_range_by_row JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS boundary_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS avg_col NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS col_consistency NUMERIC(4,3);

-- 컬럼 설명:
-- col_range_by_row: 행별 열 범위 {"1": {"min": 1, "max": 9, "avg": 4.2, "count": 45}, ...}
-- boundary_info: 경계선 정보 {"1": {"boundary_col": 9, "overlap": 1}, ...}
-- avg_col: 전체 평균 열 위치
-- col_consistency: 열 배치 일관성 점수 (0-1)

COMMENT ON COLUMN learned_part_placement_rules.col_range_by_row IS '행별 열 범위 통계 (min, max, avg, count)';
COMMENT ON COLUMN learned_part_placement_rules.boundary_info IS '파트 경계선 정보';
COMMENT ON COLUMN learned_part_placement_rules.avg_col IS '전체 평균 열 위치';
COMMENT ON COLUMN learned_part_placement_rules.col_consistency IS '열 배치 일관성 점수 (0-1)';
