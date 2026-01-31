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
-- 프로덕션 데이터 임포트 시 auth.users와 불일치하는 고아 프로필 자동 정리
DELETE FROM user_profiles WHERE id NOT IN (SELECT id FROM auth.users);
INSERT INTO user_profiles (id, email, name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@test.com', '관리자', 'ADMIN'
) ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

-- -----------------------------------------------------------------------------
-- 0-1. 지휘자 계정 (conductor@test.com / conductor3586)
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  email_change_confirm_status,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated',
  'conductor@test.com',
  crypt('conductor3586', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '',
  '', '', '',
  0,
  '{"provider":"email","providers":["email"]}',
  '{"name":"지휘자"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  'conductor@test.com',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000002', 'email', 'conductor@test.com'),
  'email',
  NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

INSERT INTO user_profiles (id, email, name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'conductor@test.com', '지휘자', 'CONDUCTOR'
) ON CONFLICT (id) DO UPDATE SET role = 'CONDUCTOR';

-- -----------------------------------------------------------------------------
-- 0-2. 파트장 계정 4명 (소프라노/알토/테너/베이스)
-- -----------------------------------------------------------------------------
-- 소프라노 파트장 (soprano@test.com / soprano3586)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  email_change_confirm_status,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000011',
  'authenticated', 'authenticated',
  'soprano@test.com',
  crypt('soprano3586', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '',
  '', '', '',
  0,
  '{"provider":"email","providers":["email"]}',
  '{"name":"소프라노파트장"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000011',
  'a0000000-0000-0000-0000-000000000011',
  'soprano@test.com',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000011', 'email', 'soprano@test.com'),
  'email',
  NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- 알토 파트장 (alto@test.com / alto3586)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  email_change_confirm_status,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000012',
  'authenticated', 'authenticated',
  'alto@test.com',
  crypt('alto3586', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '',
  '', '', '',
  0,
  '{"provider":"email","providers":["email"]}',
  '{"name":"알토파트장"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000012',
  'a0000000-0000-0000-0000-000000000012',
  'alto@test.com',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000012', 'email', 'alto@test.com'),
  'email',
  NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- 테너 파트장 (tenor@test.com / tenor3586)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  email_change_confirm_status,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000013',
  'authenticated', 'authenticated',
  'tenor@test.com',
  crypt('tenor3586', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '',
  '', '', '',
  0,
  '{"provider":"email","providers":["email"]}',
  '{"name":"테너파트장"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000013',
  'a0000000-0000-0000-0000-000000000013',
  'tenor@test.com',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000013', 'email', 'tenor@test.com'),
  'email',
  NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- 베이스 파트장 (bass@test.com / bass3586)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  email_change_confirm_status,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000014',
  'authenticated', 'authenticated',
  'bass@test.com',
  crypt('bass3586', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '',
  '', '', '',
  0,
  '{"provider":"email","providers":["email"]}',
  '{"name":"베이스파트장"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000014',
  'a0000000-0000-0000-0000-000000000014',
  'bass@test.com',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000014', 'email', 'bass@test.com'),
  'email',
  NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- 파트장 user_profiles 생성 + 대원 연결
-- 각 파트 첫 번째 대원을 파트장으로 설정하고 계정과 연결
DO $$
DECLARE
  soprano_member_id UUID;
  alto_member_id UUID;
  tenor_member_id UUID;
  bass_member_id UUID;
BEGIN
  -- 각 파트 첫 번째 대원 ID 조회
  SELECT id INTO soprano_member_id FROM members WHERE part = 'SOPRANO' AND member_status = 'REGULAR' ORDER BY name LIMIT 1;
  SELECT id INTO alto_member_id FROM members WHERE part = 'ALTO' AND member_status = 'REGULAR' ORDER BY name LIMIT 1;
  SELECT id INTO tenor_member_id FROM members WHERE part = 'TENOR' AND member_status = 'REGULAR' ORDER BY name LIMIT 1;
  SELECT id INTO bass_member_id FROM members WHERE part = 'BASS' AND member_status = 'REGULAR' ORDER BY name LIMIT 1;

  -- members 테이블: 각 파트장 대원의 email과 is_leader 설정
  UPDATE members SET email = 'soprano@test.com', is_leader = true WHERE id = soprano_member_id;
  UPDATE members SET email = 'alto@test.com', is_leader = true WHERE id = alto_member_id;
  UPDATE members SET email = 'tenor@test.com', is_leader = true WHERE id = tenor_member_id;
  UPDATE members SET email = 'bass@test.com', is_leader = true WHERE id = bass_member_id;

  -- user_profiles 생성 (linked_member_id + link_status 포함)
  INSERT INTO user_profiles (id, email, name, role, linked_member_id, link_status)
  VALUES
    ('a0000000-0000-0000-0000-000000000011', 'soprano@test.com', '소프라노파트장', 'PART_LEADER', soprano_member_id, 'approved'),
    ('a0000000-0000-0000-0000-000000000012', 'alto@test.com', '알토파트장', 'PART_LEADER', alto_member_id, 'approved'),
    ('a0000000-0000-0000-0000-000000000013', 'tenor@test.com', '테너파트장', 'PART_LEADER', tenor_member_id, 'approved'),
    ('a0000000-0000-0000-0000-000000000014', 'bass@test.com', '베이스파트장', 'PART_LEADER', bass_member_id, 'approved')
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    linked_member_id = EXCLUDED.linked_member_id,
    link_status = EXCLUDED.link_status;

  RAISE NOTICE 'Part leader accounts created:';
  RAISE NOTICE '  SOPRANO leader (member_id: %)', soprano_member_id;
  RAISE NOTICE '  ALTO leader (member_id: %)', alto_member_id;
  RAISE NOTICE '  TENOR leader (member_id: %)', tenor_member_id;
  RAISE NOTICE '  BASS leader (member_id: %)', bass_member_id;
END $$;

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
