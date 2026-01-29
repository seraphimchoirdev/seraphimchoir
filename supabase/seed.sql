-- =============================================================================
-- Supabase Seed Data for Choir Seat App
-- =============================================================================
-- 이 파일은 로컬 개발 및 Supabase 브랜칭에서 테스트 데이터를 제공합니다.
-- - 로컬: `npx supabase db reset` 실행 시 마이그레이션 후 적용
-- - 브랜칭: 새 Preview 브랜치 생성 시 자동 적용
--
-- 주의: 멤버 데이터는 마이그레이션(20251121000001_seed_members.sql)에 있습니다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. 테스트 관리자 계정 생성 (admin@test.com / admin3586)
-- -----------------------------------------------------------------------------
-- 로컬 Supabase는 프로덕션과 완전히 별개의 Auth 시스템이므로,
-- 기존 프로덕션 계정이 존재하지 않습니다.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  email_change_confirm_status,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated',
  'admin@test.com',
  crypt('admin3586', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '',
  '', '', '',
  0,
  '{"provider":"email","providers":["email"]}',
  '{"name":"관리자"}'
) ON CONFLICT (id) DO NOTHING;

-- auth.identities 레코드 추가 (이메일 로그인에 필요)
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'admin@test.com',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'email', 'admin@test.com'),
  'email',
  NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- user_profiles에 ADMIN 역할 설정
INSERT INTO user_profiles (id, email, name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@test.com', '관리자', 'ADMIN'
) ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

-- -----------------------------------------------------------------------------
-- 1. 테스트 출석 데이터 (다음 주일 기준)
-- -----------------------------------------------------------------------------
-- 80% 출석률로 랜덤 출석 데이터 생성
DO $$
DECLARE
  member_rec RECORD;
  next_sunday DATE;
BEGIN
  -- 다음 주일 계산 (오늘이 일요일이면 오늘, 아니면 다음 일요일)
  next_sunday := CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER) % 7);

  -- 오늘이 일요일이 아니면 다음 주로
  IF EXTRACT(DOW FROM CURRENT_DATE) != 0 THEN
    next_sunday := next_sunday + 7;
  END IF;

  RAISE NOTICE 'Seeding attendance data for: %', next_sunday;

  -- 정규 멤버에 대해 출석 데이터 생성
  FOR member_rec IN SELECT id FROM members WHERE member_status = 'REGULAR' LOOP
    INSERT INTO attendances (member_id, date, is_service_available)
    VALUES (member_rec.id, next_sunday, random() > 0.2)
    ON CONFLICT (member_id, date) DO NOTHING;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. 이전 주일 출석 데이터 (히스토리용)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  member_rec RECORD;
  prev_sunday DATE;
BEGIN
  -- 지난 주일 계산
  prev_sunday := CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER;
  IF EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN
    prev_sunday := CURRENT_DATE - 7;
  END IF;

  RAISE NOTICE 'Seeding previous attendance data for: %', prev_sunday;

  FOR member_rec IN SELECT id FROM members WHERE member_status = 'REGULAR' LOOP
    INSERT INTO attendances (member_id, date, is_service_available)
    VALUES (member_rec.id, prev_sunday, random() > 0.15)
    ON CONFLICT (member_id, date) DO NOTHING;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. 출석 데이터 요약 출력
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  total_members INTEGER;
  attendance_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_members FROM members WHERE member_status = 'REGULAR';
  SELECT COUNT(*) INTO attendance_count FROM attendances;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'Seed data applied successfully!';
  RAISE NOTICE 'Total members: %', total_members;
  RAISE NOTICE 'Total attendance records: %', attendance_count;
  RAISE NOTICE '====================================';
END $$;
