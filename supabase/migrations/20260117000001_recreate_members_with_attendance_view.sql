-- members_with_attendance 뷰 재생성
-- members_public 뷰가 CASCADE로 삭제되면서 함께 삭제됨
-- 이 마이그레이션은 뷰를 다시 생성합니다

-- View 재생성
CREATE OR REPLACE VIEW members_with_attendance AS
SELECT
  mp.*,
  mla.last_service_date,
  mla.last_practice_date
FROM members_public mp
LEFT JOIN member_last_attendance mla ON mp.id = mla.member_id;

-- View에 대한 SELECT 권한 부여
GRANT SELECT ON members_with_attendance TO authenticated;
