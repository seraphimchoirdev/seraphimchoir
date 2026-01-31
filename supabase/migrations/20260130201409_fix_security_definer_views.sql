-- SECURITY DEFINER → SECURITY INVOKER 변경
-- 뷰가 조회자의 RLS 정책을 따르도록 수정

-- 1. security_summary
DROP VIEW IF EXISTS public.security_summary;
CREATE VIEW public.security_summary
WITH (security_invoker = true)
AS
SELECT
  date(created_at) AS date,
  event_category,
  event_type,
  severity,
  count(*) AS event_count,
  count(DISTINCT user_id) AS unique_users,
  count(DISTINCT ip_address) AS unique_ips,
  sum(CASE WHEN is_suspicious THEN 1 ELSE 0 END) AS suspicious_count
FROM audit_logs
WHERE created_at > (now() - '30 days'::interval)
GROUP BY date(created_at), event_category, event_type, severity
ORDER BY date(created_at) DESC, count(*) DESC;

-- 2. member_last_attendance (members_with_attendance가 의존하므로 먼저 drop)
DROP VIEW IF EXISTS public.members_with_attendance;
DROP VIEW IF EXISTS public.member_last_attendance;
CREATE VIEW public.member_last_attendance
WITH (security_invoker = true)
AS
SELECT
  id AS member_id,
  (SELECT max(a.date) FROM attendances a WHERE a.member_id = m.id AND a.is_service_available = true) AS last_service_date,
  (SELECT max(a.date) FROM attendances a WHERE a.member_id = m.id AND a.is_practice_attended = true) AS last_practice_date
FROM members m;

-- 3. members_public (의존 뷰이므로 함께 수정)
DROP VIEW IF EXISTS public.members_public;
CREATE VIEW public.members_public
WITH (security_invoker = true)
AS
SELECT
  id, name, part, height_cm, regular_member_since,
  is_leader, is_singer, member_status,
  phone_number, email, notes,
  created_at, updated_at
FROM members;

-- 4. members_with_attendance (재생성)
CREATE VIEW public.members_with_attendance
WITH (security_invoker = true)
AS
SELECT
  mp.id, mp.name, mp.part, mp.height_cm, mp.regular_member_since,
  mp.is_leader, mp.is_singer, mp.member_status,
  mp.phone_number, mp.email, mp.notes,
  mp.created_at, mp.updated_at,
  mla.last_service_date,
  mla.last_practice_date
FROM members_public mp
LEFT JOIN member_last_attendance mla ON mp.id = mla.member_id;

-- 뷰 접근 권한 부여
GRANT SELECT ON public.security_summary TO authenticated;
GRANT SELECT ON public.member_last_attendance TO authenticated;
GRANT SELECT ON public.members_public TO authenticated;
GRANT SELECT ON public.members_with_attendance TO authenticated;
