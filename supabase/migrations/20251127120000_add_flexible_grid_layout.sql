-- Add flexible grid layout fields to arrangements table
-- This migration adds support for variable row counts and zigzag seating patterns

-- Add grid configuration columns
ALTER TABLE arrangements
ADD COLUMN grid_rows INTEGER DEFAULT 6 CHECK (grid_rows >= 4 AND grid_rows <= 8),
ADD COLUMN grid_layout JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN arrangements.grid_rows IS '좌석 그리드의 행(줄) 수 (4~8 범위)';
COMMENT ON COLUMN arrangements.grid_layout IS '그리드 레이아웃 상세 정보 (행별 인원 수, 지그재그 패턴 등)';

-- Backfill existing arrangements with default 4x8 grid layout
-- This ensures backward compatibility with existing seating arrangements
UPDATE arrangements
SET
  grid_rows = 4,
  grid_layout = jsonb_build_object(
    'rows', 4,
    'rowCapacities', jsonb_build_array(8, 8, 8, 8),
    'zigzagPattern', 'even'
  )
WHERE grid_layout IS NULL;
