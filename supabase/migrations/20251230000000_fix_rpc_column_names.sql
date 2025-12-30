-- RPC 함수 수정: is_available → is_service_available
-- 이전 마이그레이션에서 컬럼명이 변경되었으나 RPC 함수는 업데이트되지 않아 수정

-- =============================================================================
-- 함수 A: get_attendance_statistics - 전체 출석 통계 (수정)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_attendance_statistics(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_records INTEGER;
  v_available_count INTEGER;
  v_unavailable_count INTEGER;
  v_attendance_rate NUMERIC(5,2);
  v_result JSON;
BEGIN
  -- 날짜 범위 검증
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION '시작 날짜는 종료 날짜보다 이전이어야 합니다. start_date: %, end_date: %', p_start_date, p_end_date;
  END IF;

  -- NULL 체크
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION '시작 날짜와 종료 날짜는 필수 입력값입니다.';
  END IF;

  -- 통계 계산 (is_service_available 사용)
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE is_service_available = true) AS available,
    COUNT(*) FILTER (WHERE is_service_available = false) AS unavailable
  INTO v_total_records, v_available_count, v_unavailable_count
  FROM attendances
  WHERE date BETWEEN p_start_date AND p_end_date;

  -- 출석률 계산 (0으로 나누기 방지)
  IF v_total_records > 0 THEN
    v_attendance_rate := ROUND((v_available_count::NUMERIC / v_total_records::NUMERIC) * 100, 2);
  ELSE
    v_attendance_rate := 0;
  END IF;

  -- JSON 결과 생성
  v_result := json_build_object(
    'total_records', v_total_records,
    'available_count', v_available_count,
    'unavailable_count', v_unavailable_count,
    'attendance_rate', v_attendance_rate
  );

  RETURN v_result;
END;
$$;

-- =============================================================================
-- 함수 B: get_part_attendance_statistics - 파트별 출석 통계 (수정)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_part_attendance_statistics(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  part TEXT,
  total_count BIGINT,
  available_count BIGINT,
  unavailable_count BIGINT,
  attendance_rate NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 날짜 범위 검증
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION '시작 날짜는 종료 날짜보다 이전이어야 합니다. start_date: %, end_date: %', p_start_date, p_end_date;
  END IF;

  -- NULL 체크
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION '시작 날짜와 종료 날짜는 필수 입력값입니다.';
  END IF;

  -- 파트별 통계 계산 및 반환 (is_service_available 사용)
  RETURN QUERY
  SELECT
    m.part::TEXT AS part,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE a.is_service_available = true) AS available_count,
    COUNT(*) FILTER (WHERE a.is_service_available = false) AS unavailable_count,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE a.is_service_available = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE
        0::NUMERIC(5,2)
    END AS attendance_rate
  FROM attendances a
  INNER JOIN members m ON a.member_id = m.id
  WHERE a.date BETWEEN p_start_date AND p_end_date
  GROUP BY m.part
  ORDER BY m.part;
END;
$$;

-- =============================================================================
-- 함수 C: get_member_attendance_history - 개별 인원 출석 이력 (수정)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_member_attendance_history(
  p_member_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  is_available BOOLEAN,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- member_id NULL 체크
  IF p_member_id IS NULL THEN
    RAISE EXCEPTION '회원 ID는 필수 입력값입니다.';
  END IF;

  -- 회원 존재 여부 확인
  IF NOT EXISTS (SELECT 1 FROM members WHERE id = p_member_id) THEN
    RAISE EXCEPTION '존재하지 않는 회원입니다. member_id: %', p_member_id;
  END IF;

  -- 날짜 범위 검증 (둘 다 제공된 경우만)
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL AND p_start_date > p_end_date THEN
    RAISE EXCEPTION '시작 날짜는 종료 날짜보다 이전이어야 합니다. start_date: %, end_date: %', p_start_date, p_end_date;
  END IF;

  -- 출석 이력 조회 및 반환 (is_service_available을 is_available로 alias)
  RETURN QUERY
  SELECT
    a.date,
    a.is_service_available AS is_available,
    a.notes
  FROM attendances a
  WHERE a.member_id = p_member_id
    AND (p_start_date IS NULL OR a.date >= p_start_date)
    AND (p_end_date IS NULL OR a.date <= p_end_date)
  ORDER BY a.date DESC;
END;
$$;

-- =============================================================================
-- 함수 D: get_attendance_summary_by_date - 날짜별 요약 통계 (수정)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_attendance_summary_by_date(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  total_count BIGINT,
  available_count BIGINT,
  unavailable_count BIGINT,
  attendance_rate NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 날짜 범위 검증
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION '시작 날짜는 종료 날짜보다 이전이어야 합니다. start_date: %, end_date: %', p_start_date, p_end_date;
  END IF;

  -- NULL 체크
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION '시작 날짜와 종료 날짜는 필수 입력값입니다.';
  END IF;

  -- 날짜별 통계 계산 및 반환 (is_service_available 사용)
  RETURN QUERY
  SELECT
    a.date,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE a.is_service_available = true) AS available_count,
    COUNT(*) FILTER (WHERE a.is_service_available = false) AS unavailable_count,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE a.is_service_available = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE
        0::NUMERIC(5,2)
    END AS attendance_rate
  FROM attendances a
  WHERE a.date BETWEEN p_start_date AND p_end_date
  GROUP BY a.date
  ORDER BY a.date ASC;
END;
$$;

-- 권한 재부여 (기존 권한이 유지되지만 명시적으로 재설정)
GRANT EXECUTE ON FUNCTION get_attendance_statistics(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_part_attendance_statistics(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_member_attendance_history(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_attendance_summary_by_date(DATE, DATE) TO authenticated;

-- 인덱스 이름 업데이트 (기존 인덱스가 있을 경우)
DROP INDEX IF EXISTS idx_attendances_is_available;
CREATE INDEX IF NOT EXISTS idx_attendances_is_service_available ON attendances(is_service_available);
