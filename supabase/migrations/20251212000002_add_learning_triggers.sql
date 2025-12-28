-- Phase 4.2: 자동 학습 트리거 함수
-- 배치 저장 시 학습 데이터 자동 갱신

-- ============================================================
-- 1. 대원별 좌석 통계 갱신 함수
-- ============================================================
-- seats 테이블에 INSERT 또는 UPDATE 시 해당 대원의 통계를 갱신

CREATE OR REPLACE FUNCTION update_member_seat_statistics_on_seat_change()
RETURNS TRIGGER AS $$
DECLARE
  v_member_id UUID;
  v_seat_row INTEGER;
  v_seat_column INTEGER;
  v_arrangement_date DATE;
  v_existing_stats member_seat_statistics%ROWTYPE;
  v_new_row_counts JSONB;
  v_new_col_sum INTEGER;
  v_new_total INTEGER;
  v_most_frequent_row INTEGER;
  v_max_row_count INTEGER;
  v_row_consistency_calc NUMERIC;
  v_avg_col INTEGER;
  v_col_consistency_calc NUMERIC;
  v_is_fixed BOOLEAN;
BEGIN
  -- INSERT나 UPDATE 이벤트에서 새 값 사용
  v_member_id := NEW.member_id;
  v_seat_row := NEW.seat_row;
  v_seat_column := NEW.seat_column;

  -- 배치표의 날짜 조회
  SELECT date INTO v_arrangement_date
  FROM arrangements
  WHERE id = NEW.arrangement_id;

  -- 기존 통계 조회
  SELECT * INTO v_existing_stats
  FROM member_seat_statistics
  WHERE member_id = v_member_id;

  IF NOT FOUND THEN
    -- 새 통계 레코드 생성
    INSERT INTO member_seat_statistics (
      member_id,
      preferred_row,
      preferred_col,
      row_consistency,
      col_consistency,
      is_fixed_seat,
      total_appearances,
      row_counts,
      col_sum,
      last_arrangement_date
    )
    VALUES (
      v_member_id,
      v_seat_row,
      v_seat_column,
      100, -- 첫 번째 배치는 100% 일관성
      100,
      false, -- 최소 3회 이상 출석해야 고정석 판정
      1,
      jsonb_build_object(v_seat_row::text, 1),
      v_seat_column,
      v_arrangement_date
    );
  ELSE
    -- 기존 통계 업데이트
    -- 1. row_counts 업데이트
    v_new_row_counts := v_existing_stats.row_counts;
    v_new_row_counts := jsonb_set(
      v_new_row_counts,
      ARRAY[v_seat_row::text],
      to_jsonb(COALESCE((v_new_row_counts->>v_seat_row::text)::integer, 0) + 1)
    );

    -- 2. col_sum 및 total 업데이트
    v_new_col_sum := v_existing_stats.col_sum + v_seat_column;
    v_new_total := v_existing_stats.total_appearances + 1;

    -- 3. 가장 많이 앉은 행 찾기
    SELECT (kv.key)::integer, (kv.value)::integer
    INTO v_most_frequent_row, v_max_row_count
    FROM jsonb_each_text(v_new_row_counts) AS kv
    ORDER BY (kv.value)::integer DESC
    LIMIT 1;

    -- 4. 행 일관성 계산 (가장 많이 앉은 행 비율)
    v_row_consistency_calc := ROUND((v_max_row_count::numeric / v_new_total) * 100, 2);

    -- 5. 평균 열 위치 계산
    v_avg_col := ROUND(v_new_col_sum::numeric / v_new_total);

    -- 6. 열 일관성 계산 (±2열 범위 내 비율)
    -- 간소화: 전체 배치에서 평균 ±2 범위 내 비율 추정
    -- 정확한 계산을 위해서는 별도 테이블이 필요하지만, 여기서는 근사치 사용
    -- 열 일관성이 높을수록 평균에 가깝게 앉는 경향
    v_col_consistency_calc := CASE
      WHEN v_new_total < 3 THEN 100
      ELSE GREATEST(50, LEAST(100, 100 - ABS(v_seat_column - v_avg_col) * 5))
    END;

    -- 7. 고정석 판정 (최소 3회 이상 + 80% 이상 일관성)
    v_is_fixed := (v_new_total >= 3 AND v_row_consistency_calc >= 80 AND v_col_consistency_calc >= 80);

    -- 8. 통계 업데이트
    UPDATE member_seat_statistics
    SET
      row_counts = v_new_row_counts,
      col_sum = v_new_col_sum,
      total_appearances = v_new_total,
      preferred_row = v_most_frequent_row,
      preferred_col = v_avg_col,
      row_consistency = v_row_consistency_calc,
      col_consistency = v_col_consistency_calc,
      is_fixed_seat = v_is_fixed,
      last_arrangement_date = v_arrangement_date,
      updated_at = now()
    WHERE member_id = v_member_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성: seats 테이블 INSERT/UPDATE 시
DROP TRIGGER IF EXISTS trg_update_member_stats_on_seat ON seats;
CREATE TRIGGER trg_update_member_stats_on_seat
  AFTER INSERT OR UPDATE ON seats
  FOR EACH ROW
  EXECUTE FUNCTION update_member_seat_statistics_on_seat_change();

-- ============================================================
-- 2. 행 분배 패턴 갱신 함수
-- ============================================================
-- 배치표 완료 시 (ml_arrangement_history 삽입 시) 패턴 학습

CREATE OR REPLACE FUNCTION update_row_distribution_pattern_on_history()
RETURNS TRIGGER AS $$
DECLARE
  v_total_members INTEGER;
  v_rows INTEGER;
  v_capacities INTEGER[];
BEGIN
  v_total_members := NEW.total_members;

  -- grid_layout에서 rows와 capacities 추출
  v_rows := (NEW.grid_layout->>'rows')::integer;
  v_capacities := ARRAY(
    SELECT (jsonb_array_elements_text(NEW.grid_layout->'rowCapacities'))::integer
  );

  -- 패턴 UPSERT
  INSERT INTO row_distribution_patterns (total_members, rows, capacities, observations)
  VALUES (v_total_members, v_rows, v_capacities, 1)
  ON CONFLICT (total_members)
  DO UPDATE SET
    -- 가장 최근 패턴 사용 (또는 가중 평균 등 고급 로직 가능)
    rows = EXCLUDED.rows,
    capacities = EXCLUDED.capacities,
    observations = row_distribution_patterns.observations + 1,
    last_updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성: ml_arrangement_history 테이블 INSERT 시
DROP TRIGGER IF EXISTS trg_update_row_pattern_on_history ON ml_arrangement_history;
CREATE TRIGGER trg_update_row_pattern_on_history
  AFTER INSERT ON ml_arrangement_history
  FOR EACH ROW
  EXECUTE FUNCTION update_row_distribution_pattern_on_history();

-- ============================================================
-- 3. 배치표 저장 완료 시 ML 이력 자동 기록 함수
-- ============================================================
-- API에서 직접 호출하는 것이 좋지만, 편의를 위해 RPC 함수로도 제공

CREATE OR REPLACE FUNCTION record_arrangement_to_ml_history(
  p_arrangement_id UUID,
  p_quality_score NUMERIC DEFAULT NULL,
  p_metrics JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_arrangement arrangements%ROWTYPE;
  v_total_members INTEGER;
  v_part_breakdown JSONB;
  v_grid_layout JSONB;
  v_new_history_id UUID;
BEGIN
  -- 배치표 정보 조회
  SELECT * INTO v_arrangement
  FROM arrangements
  WHERE id = p_arrangement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Arrangement not found: %', p_arrangement_id;
  END IF;

  -- 총 인원 및 파트별 분포 계산
  SELECT
    COUNT(*),
    jsonb_object_agg(part::text, part_count)
  INTO v_total_members, v_part_breakdown
  FROM (
    SELECT part, COUNT(*) as part_count
    FROM seats
    WHERE arrangement_id = p_arrangement_id
    GROUP BY part
  ) sub;

  -- 그리드 레이아웃 (arrangement에서 가져오거나 계산)
  v_grid_layout := COALESCE(
    v_arrangement.grid_layout,
    jsonb_build_object(
      'rows', v_arrangement.grid_rows,
      'rowCapacities', '[]'::jsonb,
      'zigzagPattern', 'even'
    )
  );

  -- ML 이력 삽입 (기존 레코드가 있으면 업데이트)
  INSERT INTO ml_arrangement_history (
    arrangement_id,
    date,
    total_members,
    part_breakdown,
    grid_layout,
    quality_score,
    metrics
  )
  VALUES (
    p_arrangement_id,
    v_arrangement.date,
    v_total_members,
    v_part_breakdown,
    v_grid_layout,
    p_quality_score,
    p_metrics
  )
  ON CONFLICT (arrangement_id)
  DO UPDATE SET
    total_members = EXCLUDED.total_members,
    part_breakdown = EXCLUDED.part_breakdown,
    grid_layout = EXCLUDED.grid_layout,
    quality_score = COALESCE(EXCLUDED.quality_score, ml_arrangement_history.quality_score),
    metrics = COALESCE(EXCLUDED.metrics, ml_arrangement_history.metrics)
  RETURNING id INTO v_new_history_id;

  RETURN v_new_history_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. 대원 통계 일괄 재계산 함수 (유지보수용)
-- ============================================================
-- 기존 데이터 기반으로 모든 대원의 통계를 재계산

CREATE OR REPLACE FUNCTION recalculate_all_member_statistics()
RETURNS TABLE (
  member_id UUID,
  total_appearances INTEGER,
  is_fixed_seat BOOLEAN
) AS $$
DECLARE
  v_member RECORD;
  v_seat RECORD;
  v_row_counts JSONB;
  v_col_sum INTEGER;
  v_total INTEGER;
  v_most_frequent_row INTEGER;
  v_max_row_count INTEGER;
  v_row_consistency NUMERIC;
  v_col_consistency NUMERIC;
  v_avg_col INTEGER;
BEGIN
  -- 모든 대원에 대해
  FOR v_member IN SELECT DISTINCT s.member_id FROM seats s LOOP
    v_row_counts := '{}'::jsonb;
    v_col_sum := 0;
    v_total := 0;

    -- 해당 대원의 모든 배치 기록 집계
    FOR v_seat IN
      SELECT s.seat_row, s.seat_column
      FROM seats s
      WHERE s.member_id = v_member.member_id
    LOOP
      v_total := v_total + 1;
      v_col_sum := v_col_sum + v_seat.seat_column;
      v_row_counts := jsonb_set(
        v_row_counts,
        ARRAY[v_seat.seat_row::text],
        to_jsonb(COALESCE((v_row_counts->>v_seat.seat_row::text)::integer, 0) + 1)
      );
    END LOOP;

    -- 가장 많이 앉은 행 찾기
    SELECT (kv.key)::integer, (kv.value)::integer
    INTO v_most_frequent_row, v_max_row_count
    FROM jsonb_each_text(v_row_counts) AS kv
    ORDER BY (kv.value)::integer DESC
    LIMIT 1;

    -- 일관성 계산
    IF v_total > 0 THEN
      v_row_consistency := ROUND((v_max_row_count::numeric / v_total) * 100, 2);
      v_avg_col := ROUND(v_col_sum::numeric / v_total);
      v_col_consistency := 85; -- 간소화된 값 (정확한 계산 필요시 별도 로직)
    ELSE
      v_row_consistency := 0;
      v_avg_col := 0;
      v_col_consistency := 0;
    END IF;

    -- 통계 업데이트 또는 삽입
    INSERT INTO member_seat_statistics (
      member_id,
      preferred_row,
      preferred_col,
      row_consistency,
      col_consistency,
      is_fixed_seat,
      total_appearances,
      row_counts,
      col_sum
    )
    VALUES (
      v_member.member_id,
      v_most_frequent_row,
      v_avg_col,
      v_row_consistency,
      v_col_consistency,
      (v_total >= 3 AND v_row_consistency >= 80 AND v_col_consistency >= 80),
      v_total,
      v_row_counts,
      v_col_sum
    )
    ON CONFLICT (member_id)
    DO UPDATE SET
      preferred_row = EXCLUDED.preferred_row,
      preferred_col = EXCLUDED.preferred_col,
      row_consistency = EXCLUDED.row_consistency,
      col_consistency = EXCLUDED.col_consistency,
      is_fixed_seat = EXCLUDED.is_fixed_seat,
      total_appearances = EXCLUDED.total_appearances,
      row_counts = EXCLUDED.row_counts,
      col_sum = EXCLUDED.col_sum,
      updated_at = now();

    -- 결과 반환
    member_id := v_member.member_id;
    total_appearances := v_total;
    is_fixed_seat := (v_total >= 3 AND v_row_consistency >= 80 AND v_col_consistency >= 80);
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 코멘트 추가
-- ============================================================

COMMENT ON FUNCTION update_member_seat_statistics_on_seat_change() IS
  '좌석 배치 변경 시 대원별 통계를 자동 갱신하는 트리거 함수';

COMMENT ON FUNCTION update_row_distribution_pattern_on_history() IS
  'ML 이력 추가 시 행 분배 패턴을 자동 학습하는 트리거 함수';

COMMENT ON FUNCTION record_arrangement_to_ml_history(UUID, NUMERIC, JSONB) IS
  '배치표를 ML 학습 이력에 기록하는 RPC 함수 (API에서 호출)';

COMMENT ON FUNCTION recalculate_all_member_statistics() IS
  '모든 대원의 통계를 기존 배치 데이터 기반으로 재계산하는 유지보수용 함수';
