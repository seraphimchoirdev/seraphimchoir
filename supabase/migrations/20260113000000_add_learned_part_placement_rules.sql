-- =============================================================================
-- 학습된 파트 배치 규칙 테이블
-- 과거 배치 데이터에서 학습된 파트별 영역 규칙을 저장
-- =============================================================================

CREATE TABLE learned_part_placement_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 분류 키 (복합 UNIQUE)
  service_type TEXT NOT NULL,                      -- '2부예배', '온세대예배', '특별예배' 등
  member_count_range TEXT NOT NULL,                -- '60-69', '70-79', '80-89' 등 (10명 단위)
  part TEXT NOT NULL CHECK (part IN ('SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL')),

  -- 학습된 규칙
  side TEXT NOT NULL CHECK (side IN ('left', 'right', 'both')),  -- 선호 측면
  preferred_rows INTEGER[] NOT NULL,               -- 선호 행 순서 (빈도 내림차순)
  overflow_rows INTEGER[] NOT NULL DEFAULT '{}',   -- 오버플로우 행 (5% 미만 배치)
  forbidden_rows INTEGER[] NOT NULL DEFAULT '{}',  -- 금지 행 (0% 배치)

  -- 학습 통계
  row_distribution JSONB NOT NULL,                 -- {"1": 35.2, "2": 28.1, ...} (%)
  side_percentage NUMERIC(5,2) NOT NULL,           -- 해당 측면 배치 비율 (0-100)
  front_row_percentage NUMERIC(5,2) NOT NULL,      -- 1-3행 배치 비율 (0-100)

  -- 샘플 수 및 신뢰도
  sample_count INTEGER NOT NULL DEFAULT 0,         -- 학습에 사용된 배치 수
  total_seats_analyzed INTEGER NOT NULL DEFAULT 0, -- 분석된 총 좌석 수
  confidence_score NUMERIC(5,4),                   -- 신뢰도 점수 (0-1)

  -- 타임스탬프
  last_learned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(service_type, member_count_range, part)
);

-- 인덱스
CREATE INDEX idx_learned_rules_lookup
  ON learned_part_placement_rules(service_type, member_count_range);
CREATE INDEX idx_learned_rules_part
  ON learned_part_placement_rules(part);

-- 코멘트
COMMENT ON TABLE learned_part_placement_rules IS '과거 배치 데이터에서 학습된 파트별 영역 배치 규칙';
COMMENT ON COLUMN learned_part_placement_rules.service_type IS '예배 유형 (2부예배, 온세대예배 등)';
COMMENT ON COLUMN learned_part_placement_rules.member_count_range IS '인원수 구간 (60-69, 70-79 등)';
COMMENT ON COLUMN learned_part_placement_rules.preferred_rows IS '선호 행 순서 (빈도 내림차순)';
COMMENT ON COLUMN learned_part_placement_rules.forbidden_rows IS '금지 행 (0% 배치된 행)';
COMMENT ON COLUMN learned_part_placement_rules.confidence_score IS '신뢰도 점수 (샘플 수 기반, 0-1)';

-- RLS 활성화
ALTER TABLE learned_part_placement_rules ENABLE ROW LEVEL SECURITY;

-- 정책: 인증된 사용자는 읽기 가능
CREATE POLICY "learned_part_placement_rules_select"
  ON learned_part_placement_rules FOR SELECT
  TO authenticated
  USING (true);

-- 정책: CONDUCTOR 이상만 수정 가능
CREATE POLICY "learned_part_placement_rules_all"
  ON learned_part_placement_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'CONDUCTOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'CONDUCTOR')
    )
  );
