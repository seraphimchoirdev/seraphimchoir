-- 출석 통계 RPC 함수 추가
-- Add attendance statistics RPC functions for analytics and reporting

-- =============================================================================
-- 함수 A: get_attendance_statistics - 전체 출석 통계
-- =============================================================================
-- 설명: 지정된 기간 동안의 전체 출석 통계를 JSON 형태로 반환
-- 파라미터:
--   - p_start_date: 시작 날짜
--   - p_end_date: 종료 날짜
-- 반환값: JSON 객체 { total_records, available_count, unavailable_count, attendance_rate }
-- 권한: authenticated 사용자만 실행 가능
-- 성능: idx_attendances_date, idx_attendances_is_available 인덱스 활용
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

  -- 통계 계산 (단일 쿼리로 최적화)
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE is_available = true) AS available,
    COUNT(*) FILTER (WHERE is_available = false) AS unavailable
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

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_attendance_statistics(DATE, DATE) TO authenticated;

-- 함수 주석
COMMENT ON FUNCTION get_attendance_statistics(DATE, DATE) IS
'지정된 기간 동안의 전체 출석 통계를 반환합니다. 총 기록 수, 출석 가능 수, 출석 불가능 수, 출석률을 JSON으로 반환합니다.';

-- =============================================================================
-- 함수 B: get_part_attendance_statistics - 파트별 출석 통계
-- =============================================================================
-- 설명: 지정된 기간 동안의 파트별 출석 통계를 테이블 형태로 반환
-- 파라미터:
--   - p_start_date: 시작 날짜
--   - p_end_date: 종료 날짜
-- 반환값: TABLE (part, total_count, available_count, unavailable_count, attendance_rate)
-- 권한: authenticated 사용자만 실행 가능
-- 성능: idx_attendances_date, idx_members_part, idx_attendances_member_id 인덱스 활용
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

  -- 파트별 통계 계산 및 반환
  RETURN QUERY
  SELECT
    m.part::TEXT AS part,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE a.is_available = true) AS available_count,
    COUNT(*) FILTER (WHERE a.is_available = false) AS unavailable_count,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE a.is_available = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
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

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_part_attendance_statistics(DATE, DATE) TO authenticated;

-- 함수 주석
COMMENT ON FUNCTION get_part_attendance_statistics(DATE, DATE) IS
'지정된 기간 동안의 파트별 출석 통계를 반환합니다. 각 파트(SOPRANO, ALTO, TENOR, BASS, SPECIAL)의 출석 현황을 제공합니다.';

-- =============================================================================
-- 함수 C: get_member_attendance_history - 개별 인원 출석 이력
-- =============================================================================
-- 설명: 특정 회원의 출석 기록을 조회하여 날짜 역순으로 반환
-- 파라미터:
--   - p_member_id: 회원 ID (필수)
--   - p_start_date: 시작 날짜 (선택, NULL이면 전체 조회)
--   - p_end_date: 종료 날짜 (선택, NULL이면 전체 조회)
-- 반환값: TABLE (date, is_available, notes)
-- 권한: authenticated 사용자만 실행 가능
-- 성능: idx_attendances_member_id, idx_attendances_date 인덱스 활용
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

  -- 출석 이력 조회 및 반환
  RETURN QUERY
  SELECT
    a.date,
    a.is_available,
    a.notes
  FROM attendances a
  WHERE a.member_id = p_member_id
    AND (p_start_date IS NULL OR a.date >= p_start_date)
    AND (p_end_date IS NULL OR a.date <= p_end_date)
  ORDER BY a.date DESC;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_member_attendance_history(UUID, DATE, DATE) TO authenticated;

-- 함수 주석
COMMENT ON FUNCTION get_member_attendance_history(UUID, DATE, DATE) IS
'특정 회원의 출석 기록을 조회합니다. 날짜 범위를 지정하지 않으면 전체 출석 이력을 반환합니다. 날짜 역순으로 정렬됩니다.';

-- =============================================================================
-- 함수 D: get_attendance_summary_by_date - 날짜별 요약 통계
-- =============================================================================
-- 설명: 지정된 기간 동안의 날짜별 출석 통계를 반환
-- 파라미터:
--   - p_start_date: 시작 날짜
--   - p_end_date: 종료 날짜
-- 반환값: TABLE (date, total_count, available_count, unavailable_count, attendance_rate)
-- 권한: authenticated 사용자만 실행 가능
-- 성능: idx_attendances_date 인덱스 활용
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

  -- 날짜별 통계 계산 및 반환
  RETURN QUERY
  SELECT
    a.date,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE a.is_available = true) AS available_count,
    COUNT(*) FILTER (WHERE a.is_available = false) AS unavailable_count,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE a.is_available = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE
        0::NUMERIC(5,2)
    END AS attendance_rate
  FROM attendances a
  WHERE a.date BETWEEN p_start_date AND p_end_date
  GROUP BY a.date
  ORDER BY a.date ASC;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_attendance_summary_by_date(DATE, DATE) TO authenticated;

-- 함수 주석
COMMENT ON FUNCTION get_attendance_summary_by_date(DATE, DATE) IS
'지정된 기간 동안의 날짜별 출석 통계를 반환합니다. 각 날짜의 총 출석 기록, 출석 가능 수, 출석 불가능 수, 출석률을 제공합니다.';

-- =============================================================================
-- 성능 최적화 참고사항
-- =============================================================================
--
-- 기존 인덱스 활용:
-- - idx_attendances_date: 날짜 범위 필터링에 사용 (모든 함수)
-- - idx_attendances_is_available: is_available 필터링에 사용 (함수 A)
-- - idx_attendances_member_id: 회원별 조회에 사용 (함수 C)
-- - idx_members_part: 파트별 조인에 사용 (함수 B)
--
-- 추가 인덱스 고려사항:
-- - 현재 인덱스로 충분한 성능을 제공합니다.
-- - 데이터가 대량으로 증가하면 복합 인덱스 고려 가능:
--   CREATE INDEX idx_attendances_date_available ON attendances(date, is_available);
--   CREATE INDEX idx_attendances_member_date ON attendances(member_id, date DESC);
--
-- 쿼리 성능 확인 방법:
-- EXPLAIN ANALYZE SELECT * FROM get_attendance_statistics('2025-01-01', '2025-12-31');
-- EXPLAIN ANALYZE SELECT * FROM get_part_attendance_statistics('2025-01-01', '2025-12-31');
-- EXPLAIN ANALYZE SELECT * FROM get_member_attendance_history('uuid-here', '2025-01-01', '2025-12-31');
-- EXPLAIN ANALYZE SELECT * FROM get_attendance_summary_by_date('2025-01-01', '2025-12-31');
--
-- =============================================================================

-- =============================================================================
-- 사용 예시
-- =============================================================================
--
-- 1. 전체 출석 통계 (2025년 1월)
-- SELECT * FROM get_attendance_statistics('2025-01-01', '2025-01-31');
-- 결과: {"total_records": 100, "available_count": 85, "unavailable_count": 15, "attendance_rate": 85.00}
--
-- 2. 파트별 출석 통계 (2025년 1분기)
-- SELECT * FROM get_part_attendance_statistics('2025-01-01', '2025-03-31');
-- 결과:
-- part     | total_count | available_count | unavailable_count | attendance_rate
-- ---------|-------------|-----------------|-------------------|----------------
-- SOPRANO  | 30          | 25              | 5                 | 83.33
-- ALTO     | 25          | 22              | 3                 | 88.00
-- TENOR    | 28          | 24              | 4                 | 85.71
-- BASS     | 17          | 14              | 3                 | 82.35
--
-- 3. 특정 회원 출석 이력 (전체 기간)
-- SELECT * FROM get_member_attendance_history('uuid-here');
-- 결과:
-- date       | is_available | notes
-- -----------|--------------|------------------
-- 2025-01-22 | true         | NULL
-- 2025-01-15 | false        | 개인 사정
-- 2025-01-08 | true         | NULL
--
-- 4. 특정 회원 출석 이력 (기간 지정)
-- SELECT * FROM get_member_attendance_history('uuid-here', '2025-01-01', '2025-01-31');
--
-- 5. 날짜별 요약 통계 (2025년 1월)
-- SELECT * FROM get_attendance_summary_by_date('2025-01-01', '2025-01-31');
-- 결과:
-- date       | total_count | available_count | unavailable_count | attendance_rate
-- -----------|-------------|-----------------|-------------------|----------------
-- 2025-01-08 | 45          | 40              | 5                 | 88.89
-- 2025-01-15 | 42          | 38              | 4                 | 90.48
-- 2025-01-22 | 44          | 39              | 5                 | 88.64
--
-- =============================================================================

-- =============================================================================
-- Supabase Client에서 호출 방법
-- =============================================================================
--
-- 1. get_attendance_statistics
-- const { data, error } = await supabase.rpc('get_attendance_statistics', {
--   p_start_date: '2025-01-01',
--   p_end_date: '2025-01-31'
-- });
-- console.log(data); // { total_records: 100, available_count: 85, ... }
--
-- 2. get_part_attendance_statistics
-- const { data, error } = await supabase.rpc('get_part_attendance_statistics', {
--   p_start_date: '2025-01-01',
--   p_end_date: '2025-03-31'
-- });
-- console.log(data); // [{ part: 'SOPRANO', total_count: 30, ... }, ...]
--
-- 3. get_member_attendance_history
-- const { data, error } = await supabase.rpc('get_member_attendance_history', {
--   p_member_id: 'uuid-here',
--   p_start_date: '2025-01-01', // 선택사항
--   p_end_date: '2025-01-31'    // 선택사항
-- });
-- console.log(data); // [{ date: '2025-01-22', is_available: true, ... }, ...]
--
-- 4. get_attendance_summary_by_date
-- const { data, error } = await supabase.rpc('get_attendance_summary_by_date', {
--   p_start_date: '2025-01-01',
--   p_end_date: '2025-01-31'
-- });
-- console.log(data); // [{ date: '2025-01-08', total_count: 45, ... }, ...]
--
-- =============================================================================

-- =============================================================================
-- TypeScript 타입 정의 예시
-- =============================================================================
--
-- // 전체 출석 통계 응답
-- interface AttendanceStatistics {
--   total_records: number;
--   available_count: number;
--   unavailable_count: number;
--   attendance_rate: number;
-- }
--
-- // 파트별 출석 통계 응답
-- interface PartAttendanceStatistics {
--   part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';
--   total_count: number;
--   available_count: number;
--   unavailable_count: number;
--   attendance_rate: number;
-- }
--
-- // 회원 출석 이력 응답
-- interface MemberAttendanceHistory {
--   date: string; // ISO 8601 date format
--   is_available: boolean;
--   notes: string | null;
-- }
--
-- // 날짜별 요약 통계 응답
-- interface AttendanceSummaryByDate {
--   date: string; // ISO 8601 date format
--   total_count: number;
--   available_count: number;
--   unavailable_count: number;
--   attendance_rate: number;
-- }
--
-- =============================================================================
