-- =============================================
-- 대원 + 출석 정보 결합 View 생성
-- =============================================
-- 목적: 정렬(최근 등단일, 연습일) 및 장기 미출석자 필터링을 위해
-- members_public과 member_last_attendance를 조인한 뷰

-- View 생성
CREATE OR REPLACE VIEW members_with_attendance AS
SELECT
  mp.*,
  mla.last_service_date,
  mla.last_practice_date
FROM members_public mp
LEFT JOIN member_last_attendance mla ON mp.id = mla.member_id;

-- View에 대한 SELECT 권한 부여
GRANT SELECT ON members_with_attendance TO authenticated;
