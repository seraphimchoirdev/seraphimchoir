-- 신입대원 연습 세트 카운팅 기반 마련
--
-- 배경: 신입대원은 입단 후 "예배 전 연습 + 예배 후 연습"(=1세트)에 일정 횟수
--       참석해야 정대원으로 임명받고 등단할 수 있다. 지금은 파트장이 손으로 세어
--       보고하고 있는데, 시스템이 대신 세려면 두 가지가 없다:
--         (1) 전연습 참석을 기록할 컬럼        → 아래 1)
--         (2) 대원별 목표 세트 수를 담을 컬럼  → 아래 2)
--
--       세트 판정 규칙(전연습+후연습 둘 다 참석, 부분참석 인정, 불참만 제외)은
--       src/lib/practice-set-rule.ts를 단일 출처로 삼는다. 이 프로젝트는 같은
--       도메인 규칙을 여러 곳에 하드코딩해 데이터가 오염된 사고를 두 번 겪었다
--       (20260728090000_fix_service_start_time_default.sql,
--        20260729000000_fix_practice_flags.sql). SQL에는 규칙을 넣지 않는다.

-- 1) 예배 전 연습 참석 기록
--
-- boolean인 이유: 전연습은 부분 참석 개념이 없다. 후연습(practice_status)은
-- 앞부분만/뒷부분만이 있어 enum이 필요했지만 전연습은 나왔거나 안 나왔거나다.
--
-- DEFAULT NULL인 이유가 중요하다. 기존 is_service_available·is_practice_attended는
-- DEFAULT true라 "레코드 없음 = 참석"이라는 암묵 규약이 있다. 전연습은 반대여야
-- 한다 — 파트장이 적극적으로 체크하는 항목이므로 기록이 없다는 건 "아직 안 봤다"이지
-- "참석했다"가 아니다. true였다면 파트장이 화면을 열고 저장만 해도(출석 화면은 보이는
-- 전원을 스냅샷 upsert한다) 신입이 전연습에 자동 참석 처리되어 세트가 부풀려진다.
ALTER TABLE attendances
  ADD COLUMN IF NOT EXISTS pre_practice_attended BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN attendances.pre_practice_attended IS
  '예배 전 연습 참석 여부 (신입대원 세트 카운팅용). NULL=미기록, true=참석, false=불참';

-- 2) 대원별 필요 세트 수
--
-- 기본 4세트지만 고정값이 아니다. 입단일로부터 2~4주라는 폭을 지휘자가 신입마다
-- 판단해 정하므로 대원 단위 컬럼이어야 한다.
--
-- 정대원이 된 뒤에도 값을 지우지 않는다. "몇 세트를 채우기로 하고 승격했는지"가
-- 남아야 나중에 근거를 확인할 수 있다.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS required_practice_sets INTEGER DEFAULT 4;

COMMENT ON COLUMN members.required_practice_sets IS
  '정대원 승격에 필요한 연습 세트 수(전연습+후연습=1세트). 기본 4, 지휘자가 대원별로 조정';

-- 3) members_public / members_with_attendance 뷰에 누락된 컬럼 복구
--
-- 이 뷰들은 컬럼이 추가될 때마다 통째로 재작성돼 왔고(지금까지 7번), 그 과정에서
-- SELECT 목록에 넣는 걸 빠뜨린 컬럼들이 조용히 사라졌다. version은 실제로
-- 20251120082825_add_version_to_members.sql에서 한 번 들어갔다가 이후 재작성 때
-- 누락됐다.
--
-- API는 members 테이블이 아니라 이 뷰를 조회한다(api/members/route.ts:157,
-- api/members/[id]/route.ts:56). 그래서 뷰에 없는 컬럼은 화면에서 항상 undefined다.
-- 에러도 안 나고 TypeScript도 못 잡는다 — 컴포넌트가 뷰 타입이 아니라 Member 타입으로
-- 받기 때문이다. 실제로 지금 이런 증상이 두 군데서 일어나고 있다:
--   - MemberTable.tsx:318  입단일이 항상 '-'로 표시된다
--   - MemberTable.tsx:304  휴직 대원의 복직 예정일 배지가 절대 뜨지 않는다
--
-- required_practice_sets만 추가하고 나머지를 두면 같은 조사를 또 반복하게 되므로,
-- 화면이 실제로 읽는 필드를 모두 채운다.
DROP VIEW IF EXISTS public.members_with_attendance;
DROP VIEW IF EXISTS public.members_public;

CREATE VIEW public.members_public
WITH (security_invoker = true)
AS
SELECT
  id, name, part, height_cm, regular_member_since,
  is_leader, is_singer, member_status,
  phone_number, email, notes,
  created_at, updated_at,
  -- 아래부터 이번에 복구/추가된 컬럼
  joined_date,              -- 입단일 (MemberTable.tsx:318이 읽는다)
  version,                  -- 낙관적 잠금 (승격 PATCH가 쓸 수 있어야 한다)
  required_practice_sets,   -- 신규
  leave_reason,             -- 휴직 사유
  leave_start_date,         -- 휴직 시작일
  leave_duration_months,    -- 휴직 기간(개월)
  expected_return_date      -- 복직 예정일 (MemberTable.tsx:304-309가 읽는다)
FROM members;

CREATE VIEW public.members_with_attendance
WITH (security_invoker = true)
AS
SELECT
  mp.id, mp.name, mp.part, mp.height_cm, mp.regular_member_since,
  mp.is_leader, mp.is_singer, mp.member_status,
  mp.phone_number, mp.email, mp.notes,
  mp.created_at, mp.updated_at,
  mp.joined_date,
  mp.version,
  mp.required_practice_sets,
  mp.leave_reason,
  mp.leave_start_date,
  mp.leave_duration_months,
  mp.expected_return_date,
  mla.last_service_date,
  mla.last_practice_date
FROM members_public mp
LEFT JOIN member_last_attendance mla ON mp.id = mla.member_id;

GRANT SELECT ON public.members_public TO authenticated;
GRANT SELECT ON public.members_with_attendance TO authenticated;
