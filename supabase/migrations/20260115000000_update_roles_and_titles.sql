-- =============================================
-- 권한 시스템 재설계: 역할 및 직책 업데이트
-- =============================================

-- 1. user_profiles에 title 컬럼 추가 (직책명 표시용)
-- 예: 총무, 부총무, 회계, 서기, 악보계, 후원회장 등
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS title TEXT;

-- 2. 역할(role) 체계 정리
-- 기존: ADMIN, CONDUCTOR, MANAGER, PART_LEADER
-- 신규: ADMIN, CONDUCTOR, MANAGER, STAFF, PART_LEADER, MEMBER
--
-- ADMIN: 시스템 관리자 (모든 권한)
-- CONDUCTOR: 지휘자 (자리배치 편집, 대원 관리, 출석 관리)
-- MANAGER: 총무/부총무 (대원 관리, 출석 관리, 문서 관리)
-- STAFF: 대장, 서기, 회계 등 (조회 위주)
-- PART_LEADER: 파트장 (자기 파트 출석 관리)
-- MEMBER: 일반 대원 (내 출석, 자리배치표 조회)

-- 3. 대원과 연결된 사용자 중 role이 NULL인 경우 MEMBER로 설정
UPDATE user_profiles
SET role = 'MEMBER'
WHERE role IS NULL
  AND linked_member_id IS NOT NULL
  AND link_status = 'approved';

-- 4. has_role 함수 업데이트 (STAFF, MEMBER 포함)
CREATE OR REPLACE FUNCTION public.has_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- 인증되지 않은 사용자 체크
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 사용자 역할 조회
  user_role := public.get_user_role();

  -- 역할이 없으면 FALSE
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 필요한 역할 중 하나라도 있으면 TRUE
  RETURN user_role = ANY(required_roles);
END;
$$;

-- 5. 역할 유효성 검사 함수 업데이트
CREATE OR REPLACE FUNCTION public.is_valid_role(check_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN check_role IN ('ADMIN', 'CONDUCTOR', 'MANAGER', 'STAFF', 'PART_LEADER', 'MEMBER');
END;
$$;

-- 6. 인덱스 추가 (역할별 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_title ON user_profiles(title);

-- 7. 코멘트 추가
COMMENT ON COLUMN user_profiles.title IS '직책명 (예: 총무, 부총무, 회계, 서기, 악보계, 후원회장 등)';
COMMENT ON COLUMN user_profiles.role IS '역할 (ADMIN, CONDUCTOR, MANAGER, STAFF, PART_LEADER, MEMBER)';
