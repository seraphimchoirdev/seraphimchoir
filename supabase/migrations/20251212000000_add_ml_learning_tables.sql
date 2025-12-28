-- Phase 4: AI 배치 추천 고도화 - 동적 학습 테이블
-- 정적 JSON 파일에서 Supabase DB로 학습 데이터 마이그레이션

-- ============================================================
-- 1. member_seat_statistics: 대원별 좌석 통계
-- ============================================================
-- 각 대원의 배치 이력을 분석하여 선호 좌석 패턴을 저장
-- 기존 training_data/member_seat_preferences.json의 DB 버전

CREATE TABLE member_seat_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- 선호 좌석 정보 (1-based index, AI 알고리즘과 일관성 유지)
  preferred_row INTEGER,           -- 가장 많이 앉은 행
  preferred_col INTEGER,           -- 평균 열 위치

  -- 일관성 지표 (0-100)
  row_consistency NUMERIC(5,2) DEFAULT 0,  -- 행 일관성 (동일 행 비율)
  col_consistency NUMERIC(5,2) DEFAULT 0,  -- 열 일관성 (±2열 범위 비율)

  -- 고정석 여부 (row_consistency >= 80 AND col_consistency >= 80)
  is_fixed_seat BOOLEAN DEFAULT false,

  -- 통계 원시 데이터
  total_appearances INTEGER DEFAULT 0,     -- 총 배치 횟수
  row_counts JSONB DEFAULT '{}',           -- 행별 배치 횟수: {"1": 10, "2": 5}
  col_sum INTEGER DEFAULT 0,               -- 열 위치 총합 (평균 계산용)
  col_squared_sum INTEGER DEFAULT 0,       -- 열 위치 제곱합 (분산 계산용)

  -- 타임스탬프
  last_arrangement_date DATE,              -- 마지막 배치 날짜
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(member_id)
);

-- 인덱스
CREATE INDEX idx_member_seat_stats_member_id ON member_seat_statistics(member_id);
CREATE INDEX idx_member_seat_stats_is_fixed ON member_seat_statistics(is_fixed_seat) WHERE is_fixed_seat = true;
CREATE INDEX idx_member_seat_stats_appearances ON member_seat_statistics(total_appearances DESC);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_member_seat_statistics_updated_at
  BEFORE UPDATE ON member_seat_statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. row_distribution_patterns: 행 분배 패턴
-- ============================================================
-- 총 인원수별 최적의 행 구성 패턴을 학습
-- 기존 training_data/row_distribution_patterns.json의 DB 버전

CREATE TABLE row_distribution_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 패턴 키
  total_members INTEGER NOT NULL,          -- 총 인원 수 (UNIQUE)

  -- 패턴 값
  rows INTEGER NOT NULL,                   -- 행 수 (4-8)
  capacities INTEGER[] NOT NULL,           -- 행별 인원 수 배열 [15, 15, 15, 13, 11]

  -- 통계
  observations INTEGER DEFAULT 1,          -- 관측 횟수 (동일 인원 배치 횟수)

  -- 타임스탬프
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(total_members)
);

-- 인덱스
CREATE INDEX idx_row_patterns_total ON row_distribution_patterns(total_members);
CREATE INDEX idx_row_patterns_observations ON row_distribution_patterns(observations DESC);

-- ============================================================
-- 3. ml_arrangement_history: ML 학습용 배치 이력
-- ============================================================
-- 배치표 저장 시 ML 학습에 필요한 메타데이터 기록
-- 향후 Python ML 서비스에서 학습 데이터로 활용

CREATE TABLE ml_arrangement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES arrangements(id) ON DELETE CASCADE,

  -- 배치 메타데이터
  date DATE NOT NULL,
  service_type TEXT,                       -- 예배 유형 (1부, 2부, 특별)
  total_members INTEGER NOT NULL,          -- 총 배치 인원

  -- 파트별 인원 분포
  part_breakdown JSONB NOT NULL,           -- {"SOPRANO": 30, "ALTO": 23, "TENOR": 14, "BASS": 15}

  -- 그리드 정보
  grid_layout JSONB NOT NULL,              -- {"rows": 6, "rowCapacities": [15,15,15,15,13,11], "zigzagPattern": "even"}

  -- 품질 점수 (추후 수동 평가 또는 자동 계산)
  quality_score NUMERIC(5,4),              -- 0-1 범위

  -- 상세 메트릭
  metrics JSONB,                           -- {"placementRate": 1.0, "partBalance": 0.88, ...}

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(arrangement_id)
);

-- 인덱스
CREATE INDEX idx_ml_history_arrangement_id ON ml_arrangement_history(arrangement_id);
CREATE INDEX idx_ml_history_date ON ml_arrangement_history(date DESC);
CREATE INDEX idx_ml_history_total_members ON ml_arrangement_history(total_members);

-- ============================================================
-- RLS 정책 설정
-- ============================================================

-- member_seat_statistics
ALTER TABLE member_seat_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Statistics are viewable by authenticated users"
  ON member_seat_statistics FOR SELECT
  TO authenticated
  USING (true);

-- 통계는 시스템(트리거)이 자동 업데이트, CONDUCTOR 이상만 수동 수정 가능
CREATE POLICY "Statistics are editable by conductors and above"
  ON member_seat_statistics FOR ALL
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

-- row_distribution_patterns
ALTER TABLE row_distribution_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patterns are viewable by authenticated users"
  ON row_distribution_patterns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Patterns are editable by conductors and above"
  ON row_distribution_patterns FOR ALL
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

-- ml_arrangement_history
ALTER TABLE ml_arrangement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "History is viewable by authenticated users"
  ON ml_arrangement_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "History is editable by conductors and above"
  ON ml_arrangement_history FOR ALL
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

-- ============================================================
-- 코멘트 추가 (문서화)
-- ============================================================

COMMENT ON TABLE member_seat_statistics IS '대원별 좌석 배치 통계 - AI 추천 알고리즘의 학습 데이터';
COMMENT ON COLUMN member_seat_statistics.row_counts IS '행별 배치 횟수 JSONB: {"1": 10, "2": 5, "3": 2}';
COMMENT ON COLUMN member_seat_statistics.is_fixed_seat IS '고정석 여부: row_consistency >= 80 AND col_consistency >= 80';

COMMENT ON TABLE row_distribution_patterns IS '인원수별 행 분배 패턴 - 최적 그리드 구성 학습';
COMMENT ON COLUMN row_distribution_patterns.capacities IS '행별 인원 수 PostgreSQL 배열: {15, 15, 15, 13, 11}';

COMMENT ON TABLE ml_arrangement_history IS 'ML 학습용 배치 이력 - Python ML 서비스에서 활용';
COMMENT ON COLUMN ml_arrangement_history.part_breakdown IS '파트별 인원 JSONB: {"SOPRANO": 30, "ALTO": 23, ...}';
