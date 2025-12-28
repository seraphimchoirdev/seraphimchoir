-- 출석 통계 RPC 함수 테스트 쿼리
-- 이 파일은 Supabase Studio의 SQL Editor에서 실행할 수 있습니다.
-- 각 함수의 동작을 테스트하고 결과를 확인할 수 있습니다.

-- =============================================================================
-- 테스트 데이터 생성 (선택사항)
-- =============================================================================
-- 아래 쿼리는 테스트용 샘플 데이터를 생성합니다.
-- 이미 데이터가 있다면 이 섹션을 건너뛰세요.

/*
-- 샘플 회원 생성 (이미 members 테이블에 데이터가 있다면 생략)
INSERT INTO members (name, part, height, experience) VALUES
  ('김소프라노', 'SOPRANO', 165, 3),
  ('이알토', 'ALTO', 160, 2),
  ('박테너', 'TENOR', 175, 4),
  ('최베이스', 'BASS', 180, 5);

-- 샘플 출석 데이터 생성 (2025년 1월)
INSERT INTO attendances (member_id, date, is_available, notes)
SELECT
  m.id,
  d::date,
  (random() > 0.2)::boolean, -- 80% 출석률
  CASE
    WHEN random() > 0.9 THEN '개인 사정'
    WHEN random() > 0.95 THEN '건강 문제'
    ELSE NULL
  END
FROM members m
CROSS JOIN generate_series(
  '2025-01-05'::date,
  '2025-01-26'::date,
  '1 week'::interval
) d
ON CONFLICT (member_id, date) DO NOTHING;
*/

-- =============================================================================
-- 1. get_attendance_statistics - 전체 출석 통계
-- =============================================================================

-- 1-1. 2025년 1월 전체 통계
SELECT * FROM get_attendance_statistics('2025-01-01', '2025-01-31');

-- 예상 결과:
-- {
--   "total_records": 100,
--   "available_count": 85,
--   "unavailable_count": 15,
--   "attendance_rate": 85.00
-- }

-- 1-2. 2025년 1분기 전체 통계
SELECT * FROM get_attendance_statistics('2025-01-01', '2025-03-31');

-- 1-3. 최근 1개월 통계 (동적 날짜)
SELECT * FROM get_attendance_statistics(
  (CURRENT_DATE - INTERVAL '1 month')::date,
  CURRENT_DATE
);

-- =============================================================================
-- 2. get_part_attendance_statistics - 파트별 출석 통계
-- =============================================================================

-- 2-1. 2025년 1월 파트별 통계
SELECT * FROM get_part_attendance_statistics('2025-01-01', '2025-01-31');

-- 예상 결과:
-- part     | total_count | available_count | unavailable_count | attendance_rate
-- ---------|-------------|-----------------|-------------------|----------------
-- SOPRANO  | 30          | 25              | 5                 | 83.33
-- ALTO     | 25          | 22              | 3                 | 88.00
-- TENOR    | 28          | 24              | 4                 | 85.71
-- BASS     | 17          | 14              | 3                 | 82.35

-- 2-2. 2025년 전체 파트별 통계
SELECT * FROM get_part_attendance_statistics('2025-01-01', '2025-12-31');

-- 2-3. 파트별 통계를 출석률 내림차순으로 정렬
SELECT
  part,
  total_count,
  available_count,
  attendance_rate
FROM get_part_attendance_statistics('2025-01-01', '2025-01-31')
ORDER BY attendance_rate DESC;

-- 2-4. 출석률이 90% 미만인 파트 조회
SELECT
  part,
  attendance_rate
FROM get_part_attendance_statistics('2025-01-01', '2025-01-31')
WHERE attendance_rate < 90
ORDER BY attendance_rate ASC;

-- =============================================================================
-- 3. get_member_attendance_history - 개별 회원 출석 이력
-- =============================================================================

-- 3-1. 특정 회원의 전체 출석 이력 조회
-- (member_id를 실제 UUID로 변경하세요)
SELECT * FROM get_member_attendance_history('YOUR-MEMBER-UUID-HERE');

-- 예상 결과:
-- date       | is_available | notes
-- -----------|--------------|------------------
-- 2025-01-26 | true         | NULL
-- 2025-01-19 | false        | 개인 사정
-- 2025-01-12 | true         | NULL
-- 2025-01-05 | true         | NULL

-- 3-2. 특정 회원의 기간별 출석 이력 조회
SELECT * FROM get_member_attendance_history(
  'YOUR-MEMBER-UUID-HERE',
  '2025-01-01',
  '2025-01-31'
);

-- 3-3. 모든 회원의 최근 출석 이력 조회 (조인 사용)
SELECT
  m.name,
  m.part,
  h.date,
  h.is_available,
  h.notes
FROM members m
CROSS JOIN LATERAL (
  SELECT * FROM get_member_attendance_history(m.id)
  LIMIT 5
) h
ORDER BY m.name, h.date DESC;

-- 3-4. 특정 회원의 출석/결석 요약
SELECT
  COUNT(*) FILTER (WHERE is_available = true) as 출석,
  COUNT(*) FILTER (WHERE is_available = false) as 결석,
  COUNT(*) as 총기록
FROM get_member_attendance_history('YOUR-MEMBER-UUID-HERE', '2025-01-01', '2025-01-31');

-- =============================================================================
-- 4. get_attendance_summary_by_date - 날짜별 요약 통계
-- =============================================================================

-- 4-1. 2025년 1월 날짜별 통계
SELECT * FROM get_attendance_summary_by_date('2025-01-01', '2025-01-31');

-- 예상 결과:
-- date       | total_count | available_count | unavailable_count | attendance_rate
-- -----------|-------------|-----------------|-------------------|----------------
-- 2025-01-05 | 45          | 40              | 5                 | 88.89
-- 2025-01-12 | 42          | 38              | 4                 | 90.48
-- 2025-01-19 | 44          | 39              | 5                 | 88.64
-- 2025-01-26 | 43          | 40              | 3                 | 93.02

-- 4-2. 출석률이 가장 높은 날짜 TOP 5
SELECT
  date,
  total_count,
  available_count,
  attendance_rate
FROM get_attendance_summary_by_date('2025-01-01', '2025-12-31')
ORDER BY attendance_rate DESC
LIMIT 5;

-- 4-3. 출석률이 85% 미만인 날짜 조회
SELECT
  date,
  total_count,
  available_count,
  unavailable_count,
  attendance_rate
FROM get_attendance_summary_by_date('2025-01-01', '2025-12-31')
WHERE attendance_rate < 85
ORDER BY date;

-- 4-4. 월별 평균 출석률 계산
SELECT
  DATE_TRUNC('month', date)::date as month,
  ROUND(AVG(attendance_rate), 2) as avg_attendance_rate,
  SUM(total_count) as total_records,
  SUM(available_count) as total_available
FROM get_attendance_summary_by_date('2025-01-01', '2025-12-31')
GROUP BY DATE_TRUNC('month', date)
ORDER BY month;

-- =============================================================================
-- 복합 쿼리 예시
-- =============================================================================

-- 5-1. 전체 통계와 파트별 통계 함께 조회
SELECT
  '전체' as 구분,
  (SELECT total_records FROM get_attendance_statistics('2025-01-01', '2025-01-31')) as total_count,
  (SELECT attendance_rate FROM get_attendance_statistics('2025-01-01', '2025-01-31')) as attendance_rate

UNION ALL

SELECT
  part::text as 구분,
  total_count,
  attendance_rate
FROM get_part_attendance_statistics('2025-01-01', '2025-01-31')
ORDER BY 구분;

-- 5-2. 각 파트의 TOP 3 출석률 높은 회원
WITH member_stats AS (
  SELECT
    m.id,
    m.name,
    m.part,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE h.is_available = true) as available,
    ROUND((COUNT(*) FILTER (WHERE h.is_available = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) as rate
  FROM members m
  LEFT JOIN LATERAL (
    SELECT * FROM get_member_attendance_history(m.id, '2025-01-01', '2025-01-31')
  ) h ON true
  GROUP BY m.id, m.name, m.part
),
ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY part ORDER BY rate DESC) as rank
  FROM member_stats
)
SELECT
  part,
  name,
  total,
  available,
  rate as attendance_rate
FROM ranked
WHERE rank <= 3
ORDER BY part, rank;

-- 5-3. 주간별 출석 추이 분석
SELECT
  DATE_TRUNC('week', date)::date as week_start,
  COUNT(DISTINCT date) as worship_days,
  AVG(total_count) as avg_total,
  AVG(available_count) as avg_available,
  ROUND(AVG(attendance_rate), 2) as avg_attendance_rate
FROM get_attendance_summary_by_date('2025-01-01', '2025-03-31')
GROUP BY DATE_TRUNC('week', date)
ORDER BY week_start;

-- =============================================================================
-- 성능 테스트 (EXPLAIN ANALYZE)
-- =============================================================================

-- 각 함수의 실행 계획과 실제 실행 시간을 확인할 수 있습니다.
-- 실행 시간이 느리다면 인덱스 추가를 고려하세요.

-- 6-1. 전체 통계 성능
EXPLAIN ANALYZE
SELECT * FROM get_attendance_statistics('2025-01-01', '2025-12-31');

-- 6-2. 파트별 통계 성능
EXPLAIN ANALYZE
SELECT * FROM get_part_attendance_statistics('2025-01-01', '2025-12-31');

-- 6-3. 회원 이력 성능
EXPLAIN ANALYZE
SELECT * FROM get_member_attendance_history(
  (SELECT id FROM members LIMIT 1),
  '2025-01-01',
  '2025-12-31'
);

-- 6-4. 날짜별 요약 성능
EXPLAIN ANALYZE
SELECT * FROM get_attendance_summary_by_date('2025-01-01', '2025-12-31');

-- =============================================================================
-- 에러 케이스 테스트
-- =============================================================================

-- 7-1. 잘못된 날짜 범위 (시작 > 종료)
-- 에러: 시작 날짜는 종료 날짜보다 이전이어야 합니다.
-- SELECT * FROM get_attendance_statistics('2025-12-31', '2025-01-01');

-- 7-2. NULL 파라미터
-- 에러: 시작 날짜와 종료 날짜는 필수 입력값입니다.
-- SELECT * FROM get_attendance_statistics(NULL, '2025-01-31');

-- 7-3. 존재하지 않는 회원
-- 에러: 존재하지 않는 회원입니다.
-- SELECT * FROM get_member_attendance_history('00000000-0000-0000-0000-000000000000');

-- =============================================================================
-- 실제 회원 UUID 조회 (테스트용)
-- =============================================================================

-- 실제 테스트에 사용할 회원 UUID를 조회합니다.
SELECT
  id,
  name,
  part,
  (SELECT COUNT(*) FROM attendances WHERE member_id = members.id) as attendance_count
FROM members
LIMIT 10;

-- 위 결과에서 id를 복사하여 3-1, 3-2 쿼리의 'YOUR-MEMBER-UUID-HERE'를 대체하세요.

-- =============================================================================
-- 데이터 정리 (테스트 데이터 삭제)
-- =============================================================================

-- 테스트로 생성한 데이터를 삭제하려면 아래 주석을 해제하고 실행하세요.
-- 주의: 실제 프로덕션 데이터는 삭제하지 마세요!

/*
-- 테스트 출석 데이터 삭제
DELETE FROM attendances WHERE date >= '2025-01-01' AND date <= '2025-01-31';

-- 테스트 회원 데이터 삭제
DELETE FROM members WHERE name IN ('김소프라노', '이알토', '박테너', '최베이스');
*/
