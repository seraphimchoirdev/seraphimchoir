#!/usr/bin/env node
/**
 * generate-seed.mjs
 *
 * 프로덕션 Supabase에서 데이터를 가져와 supabase/seed.sql을 자동 생성합니다.
 * `npx supabase db reset` 한 번으로 프로덕션과 동일한 개발 환경을 구성할 수 있습니다.
 *
 * 사용법: npm run db:generate-seed
 *
 * 필요 환경 변수 (.env):
 *   NEXT_PUBLIC_SUPABASE_URL  - 프로덕션 Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY - 프로덕션 Service Role Key
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// === 상수 ===

const TEST_ADMIN_UUID = 'a0000000-0000-0000-0000-000000000001';
const PAGE_SIZE = 1000;
const BATCH_SIZE = 50; // multi-row INSERT 단위

// FK 의존성 순서대로 정의된 테이블 목록
const TABLES = [
  { name: 'members', orderBy: 'created_at' },
  { name: 'service_schedules', orderBy: 'date' },
  { name: 'choir_events', orderBy: 'created_at' },
  { name: 'arrangements', orderBy: 'created_at' },
  { name: 'attendances', orderBy: 'created_at' },
  { name: 'seats', orderBy: 'created_at' },
  { name: 'attendance_vote_deadlines', orderBy: 'created_at' },
  { name: 'attendance_deadlines', orderBy: 'created_at' },
  { name: 'documents', orderBy: 'created_at' },
];

// auth.users를 참조하는 컬럼 → 대체값 매핑
// NULL: FK가 nullable인 컬럼, TEST_ADMIN_UUID: NOT NULL FK
const AUTH_COLUMN_OVERRIDES = {
  'attendance_vote_deadlines.created_by': null,
  'attendance_deadlines.closed_by': TEST_ADMIN_UUID,
  'documents.uploaded_by': null,
};

// === 환경 변수 로드 ===

function loadConfig() {
  const prodEnv = dotenv.config({ path: path.join(rootDir, '.env') });
  const url = prodEnv.parsed?.NEXT_PUBLIC_SUPABASE_URL;
  const key = prodEnv.parsed?.SUPABASE_SERVICE_ROLE_KEY;

  const errors = [];
  if (!url) errors.push('NEXT_PUBLIC_SUPABASE_URL이 .env에 없습니다.');
  if (!key) errors.push('SUPABASE_SERVICE_ROLE_KEY가 .env에 없습니다.');

  if (errors.length > 0) {
    console.error('설정 오류:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  // 로컬 URL과 같으면 위험
  const localEnv = dotenv.config({ path: path.join(rootDir, '.env.local') });
  const localUrl = localEnv.parsed?.NEXT_PUBLIC_SUPABASE_URL;
  if (localUrl && url === localUrl) {
    console.error('경고: .env의 URL이 .env.local (로컬)과 동일합니다.');
    console.error('.env에는 프로덕션 Supabase URL이 있어야 합니다.');
    process.exit(1);
  }

  return { url, key };
}

// === SQL 이스케이프 ===

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return "'{}'";
    const escaped = val.map((v) =>
      typeof v === 'string' ? `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : v
    );
    return `'{${escaped.join(',')}}'`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

// === 데이터 페치 ===

async function fetchAllRows(supabase, tableName, orderBy) {
  let allData = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(orderBy, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${tableName} fetch 오류: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      offset += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

// === SQL 생성 함수들 ===

/**
 * auth.users 참조 컬럼을 안전한 값으로 대체
 */
function sanitizeAuthColumns(tableName, row) {
  const sanitized = { ...row };
  for (const [key, replacement] of Object.entries(AUTH_COLUMN_OVERRIDES)) {
    const [table, column] = key.split('.');
    if (table === tableName && column in sanitized) {
      sanitized[column] = replacement;
    }
  }
  return sanitized;
}

/**
 * 테이블 데이터를 multi-row INSERT SQL로 변환
 */
function generateInsertSQL(tableName, rows) {
  if (rows.length === 0) return `-- ${tableName}: 데이터 없음\n`;

  const columns = Object.keys(rows[0]);
  const lines = [];

  lines.push(`-- ${tableName} (${rows.length}개 행)`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const valuesList = batch.map((row) => {
      const sanitized = sanitizeAuthColumns(tableName, row);
      const values = columns.map((col) => escapeSQL(sanitized[col]));
      return `  (${values.join(', ')})`;
    });

    lines.push(
      `INSERT INTO ${tableName} (${columns.join(', ')})\nVALUES\n${valuesList.join(',\n')}\nON CONFLICT (id) DO NOTHING;`
    );
  }

  return lines.join('\n') + '\n';
}

// === 정적 SQL 템플릿 ===

const SECTION_0_TEST_ACCOUNTS = `-- =============================================================================
-- Supabase Seed Data (자동 생성)
-- 생성 시간: __TIMESTAMP__
-- =============================================================================
-- 이 파일은 scripts/generate-seed.mjs가 자동 생성합니다.
-- 직접 수정하지 마세요. 변경이 필요하면 스크립트를 수정하세요.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section 0: 테스트 계정 (auth.users + auth.identities + user_profiles)
-- -----------------------------------------------------------------------------

-- 0-0. 관리자 계정 (admin@test.com / admin3586)
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

DELETE FROM user_profiles WHERE id NOT IN (SELECT id FROM auth.users);
INSERT INTO user_profiles (id, email, name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@test.com', '관리자', 'ADMIN'
) ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

-- 0-1. 지휘자 계정 (conductor@test.com / conductor3586)
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

-- 0-2. 파트장 계정 4명 (소프라노/알토/테너/베이스)
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
`;

const SECTION_1_TRUNCATE = `
-- -----------------------------------------------------------------------------
-- Section 1: 기존 데이터 정리 (TRUNCATE - 마이그레이션 seed 데이터 교체)
-- -----------------------------------------------------------------------------
-- 자식 테이블부터 역순으로 truncate (FK 제약 회피를 위해 CASCADE 사용)
TRUNCATE TABLE documents CASCADE;
TRUNCATE TABLE attendance_deadlines CASCADE;
TRUNCATE TABLE attendance_vote_deadlines CASCADE;
TRUNCATE TABLE seats CASCADE;
TRUNCATE TABLE attendances CASCADE;
TRUNCATE TABLE arrangements CASCADE;
TRUNCATE TABLE choir_events CASCADE;
TRUNCATE TABLE service_schedules CASCADE;
TRUNCATE TABLE members CASCADE;
`;

const SECTION_3_PART_LEADERS = `
-- -----------------------------------------------------------------------------
-- Section 3: 파트장 대원 연결 (PL/pgSQL)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  soprano_member_id UUID;
  alto_member_id UUID;
  tenor_member_id UUID;
  bass_member_id UUID;
BEGIN
  -- 각 파트 첫 번째 정규 대원 ID 조회
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
`;

// === 메인 ===

async function main() {
  const config = loadConfig();

  console.log('=== seed.sql 자동 생성 ===');
  console.log(`프로덕션: ${config.url}`);
  console.log('');

  const supabase = createClient(config.url, config.key);

  // Section 0: 테스트 계정 (정적 템플릿)
  const timestamp = new Date().toISOString();
  let sql = SECTION_0_TEST_ACCOUNTS.replace('__TIMESTAMP__', timestamp);

  // Section 1: TRUNCATE
  sql += SECTION_1_TRUNCATE;

  // Section 2: 프로덕션 데이터 INSERT
  sql += `\n-- -----------------------------------------------------------------------------`;
  sql += `\n-- Section 2: 프로덕션 데이터 INSERT (FK 순서)`;
  sql += `\n-- -----------------------------------------------------------------------------\n`;

  const results = [];

  for (const table of TABLES) {
    process.stdout.write(`[${table.name}] 가져오는 중...`);

    try {
      const rows = await fetchAllRows(supabase, table.name, table.orderBy);
      process.stdout.write(` ${rows.length}행\n`);

      sql += '\n' + generateInsertSQL(table.name, rows);
      results.push({ name: table.name, count: rows.length, status: 'ok' });
    } catch (err) {
      process.stdout.write(` 오류!\n`);
      console.error(`  ${err.message}`);
      // 오류 발생해도 계속 진행 (테이블이 없을 수도 있음)
      sql += `\n-- ${table.name}: 가져오기 실패 (${err.message})\n`;
      results.push({ name: table.name, count: 0, status: 'error' });
    }
  }

  // Section 3: 파트장 대원 연결 (정적 템플릿)
  sql += SECTION_3_PART_LEADERS;

  // Section 4: 요약 출력
  sql += `\n-- -----------------------------------------------------------------------------`;
  sql += `\n-- Section 4: 요약 출력`;
  sql += `\n-- -----------------------------------------------------------------------------`;
  sql += `\nDO $$`;
  sql += `\nDECLARE`;
  sql += `\n  total_members INTEGER;`;
  sql += `\n  total_attendances INTEGER;`;
  sql += `\n  total_seats INTEGER;`;
  sql += `\nBEGIN`;
  sql += `\n  SELECT COUNT(*) INTO total_members FROM members;`;
  sql += `\n  SELECT COUNT(*) INTO total_attendances FROM attendances;`;
  sql += `\n  SELECT COUNT(*) INTO total_seats FROM seats;`;
  sql += `\n`;
  sql += `\n  RAISE NOTICE '====================================';`;
  sql += `\n  RAISE NOTICE 'Seed data applied successfully!';`;
  sql += `\n  RAISE NOTICE 'Members: %', total_members;`;
  sql += `\n  RAISE NOTICE 'Attendances: %', total_attendances;`;
  sql += `\n  RAISE NOTICE 'Seats: %', total_seats;`;
  sql += `\n  RAISE NOTICE '====================================';`;
  sql += `\nEND $$;\n`;

  // 파일 쓰기
  const outputPath = path.join(rootDir, 'supabase', 'seed.sql');
  fs.writeFileSync(outputPath, sql, 'utf-8');

  // 결과 요약
  console.log('\n=== 생성 결과 ===');
  for (const r of results) {
    const icon = r.status === 'ok' ? '+' : 'x';
    console.log(`  [${icon}] ${r.name}: ${r.count}행`);
  }

  const totalRows = results.reduce((sum, r) => sum + r.count, 0);
  const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`\n출력: ${outputPath}`);
  console.log(`크기: ${fileSize} KB (${totalRows}행)`);

  const hasError = results.some((r) => r.status === 'error');
  if (hasError) {
    console.log('\n일부 테이블을 가져오지 못했습니다. seed.sql을 확인하세요.');
    process.exit(1);
  } else {
    console.log('\nseed.sql 생성 완료!');
    console.log('다음 명령으로 적용: npx supabase db reset');
  }
}

main().catch((err) => {
  console.error('생성 실패:', err.message);
  process.exit(1);
});
