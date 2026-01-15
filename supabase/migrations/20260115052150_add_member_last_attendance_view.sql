-- =============================================
-- 대원별 최근 출석일 View 생성
-- =============================================
-- 목적: 찬양대원 관리 페이지에서 최근 등단일/연습 출석일 표시
-- - last_service_date: is_service_available = true인 가장 최근 날짜
-- - last_practice_date: is_practice_attended = true인 가장 최근 날짜

-- View 생성
CREATE OR REPLACE VIEW member_last_attendance AS
SELECT
  m.id as member_id,
  (
    SELECT MAX(a.date)
    FROM attendances a
    WHERE a.member_id = m.id AND a.is_service_available = true
  ) as last_service_date,
  (
    SELECT MAX(a.date)
    FROM attendances a
    WHERE a.member_id = m.id AND a.is_practice_attended = true
  ) as last_practice_date
FROM members m;

-- View에 대한 SELECT 권한 부여
GRANT SELECT ON member_last_attendance TO authenticated;

-- =============================================
-- 성능 최적화 인덱스
-- =============================================
-- 등단 가능 출석 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_attendances_member_service
  ON attendances(member_id, date DESC)
  WHERE is_service_available = true;

-- 연습 참석 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_attendances_member_practice
  ON attendances(member_id, date DESC)
  WHERE is_practice_attended = true;
