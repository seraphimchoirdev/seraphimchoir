#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// === 환경 변수 로드 ===

// .env 에서 프로덕션 Supabase 정보 로드
const prodEnv = dotenv.config({ path: path.join(rootDir, '.env') });
const PROD_URL = prodEnv.parsed?.NEXT_PUBLIC_SUPABASE_URL;
const PROD_SERVICE_KEY = prodEnv.parsed?.SUPABASE_SERVICE_ROLE_KEY;

// .env.local 에서 로컬 Supabase 정보 로드
const localEnv = dotenv.config({ path: path.join(rootDir, '.env.local') });
const LOCAL_URL = localEnv.parsed?.NEXT_PUBLIC_SUPABASE_URL;
const LOCAL_SERVICE_KEY = localEnv.parsed?.SUPABASE_SERVICE_ROLE_KEY;

// === 설정 검증 ===

function validateConfig() {
  const errors = [];

  if (!PROD_URL) errors.push('프로덕션 NEXT_PUBLIC_SUPABASE_URL이 .env에 없습니다.');
  if (!PROD_SERVICE_KEY) errors.push('프로덕션 SUPABASE_SERVICE_ROLE_KEY가 .env에 없습니다.');
  if (!LOCAL_URL) errors.push('로컬 NEXT_PUBLIC_SUPABASE_URL이 .env.local에 없습니다.');
  if (!LOCAL_SERVICE_KEY) errors.push('로컬 SUPABASE_SERVICE_ROLE_KEY가 .env.local에 없습니다.');

  if (errors.length > 0) {
    console.error('설정 오류:');
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('\n.env 파일에 프로덕션 정보, .env.local에 로컬 정보가 필요합니다.');
    process.exit(1);
  }

  // 프로덕션 URL이 로컬과 같으면 위험
  if (PROD_URL === LOCAL_URL) {
    console.error('프로덕션과 로컬 URL이 동일합니다. 로컬 Supabase URL을 확인하세요.');
    process.exit(1);
  }
}

// === 동기화 대상 테이블 (FK 의존성 순서) ===

const TABLES = [
  { name: 'members', orderBy: 'created_at' },
  { name: 'service_schedules', orderBy: 'date' },
  { name: 'arrangements', orderBy: 'created_at' },
  { name: 'attendances', orderBy: 'created_at' },
  { name: 'seats', orderBy: 'created_at' },
  // user_profiles 제외: auth.users FK 의존 (로컬 seed로 관리)
  { name: 'choir_events', orderBy: 'created_at' },
  { name: 'attendance_vote_deadlines', orderBy: 'created_at' },
  { name: 'documents', orderBy: 'created_at' },
];

const BATCH_SIZE = 500;
const PAGE_SIZE = 1000;

// === 유틸리티 함수 ===

async function checkLocalHealth(localUrl) {
  try {
    const res = await fetch(`${localUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: LOCAL_SERVICE_KEY },
    });
    return res.ok;
  } catch {
    return false;
  }
}

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

async function clearTable(supabase, tableName) {
  // service_role은 RLS를 우회하므로 DELETE로 전체 삭제
  const { error } = await supabase
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    throw new Error(`${tableName} 삭제 오류: ${error.message}`);
  }
}

async function insertBatch(supabase, tableName, data) {
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      throw new Error(
        `${tableName} 삽입 오류 (배치 ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`
      );
    }
    process.stdout.write(
      `\r  진행: ${Math.min(i + BATCH_SIZE, data.length)}/${data.length}행`
    );
  }
  if (data.length > 0) {
    process.stdout.write('\n');
  }
}

// === 메인 동기화 로직 ===

async function syncTable(prodClient, localClient, table) {
  const { name, orderBy } = table;

  // 1. 프로덕션에서 데이터 가져오기
  const rows = await fetchAllRows(prodClient, name, orderBy);

  if (rows.length === 0) {
    console.log(`[${name}] 데이터 없음 (건너뜀)`);
    return { name, count: 0, status: 'empty' };
  }

  // 2. 프로덕션 데이터를 로컬에 삽입 (초기화는 메인에서 역순으로 완료됨)
  await insertBatch(localClient, name, rows);

  console.log(`[${name}] ${rows.length}개 행 동기화 완료`);
  return { name, count: rows.length, status: 'ok' };
}

async function main() {
  validateConfig();

  console.log('=== 프로덕션 → 로컬 데이터 동기화 ===');
  console.log(`프로덕션: ${PROD_URL}`);
  console.log(`로컬:     ${LOCAL_URL}`);
  console.log('');

  // 로컬 Supabase 실행 확인
  const isLocalUp = await checkLocalHealth(LOCAL_URL);
  if (!isLocalUp) {
    console.error('로컬 Supabase에 연결할 수 없습니다.');
    console.error('`npx supabase start`를 먼저 실행해주세요.');
    process.exit(1);
  }
  console.log('로컬 Supabase 연결 확인 완료\n');

  // Supabase 클라이언트 생성
  const prodClient = createClient(PROD_URL, PROD_SERVICE_KEY);
  const localClient = createClient(LOCAL_URL, LOCAL_SERVICE_KEY);

  // 자식 테이블부터 역순으로 삭제 (FK 제약 회피)
  console.log('--- 로컬 테이블 초기화 (역순) ---');
  for (let i = TABLES.length - 1; i >= 0; i--) {
    const { name } = TABLES[i];
    try {
      await clearTable(localClient, name);
      console.log(`  ${name} 초기화 완료`);
    } catch (err) {
      console.warn(`  ${name} 초기화 건너뜀: ${err.message}`);
    }
  }
  console.log('');

  // 부모 테이블부터 순서대로 데이터 삽입
  console.log('--- 데이터 동기화 ---');
  const results = [];
  let hasError = false;

  for (const table of TABLES) {
    try {
      const result = await syncTable(prodClient, localClient, table);
      results.push(result);
    } catch (err) {
      console.error(`[${table.name}] 오류: ${err.message}`);
      results.push({ name: table.name, count: 0, status: 'error' });
      hasError = true;
    }
  }

  // 결과 요약
  console.log('\n=== 동기화 결과 ===');
  for (const r of results) {
    const icon = r.status === 'ok' ? '+' : r.status === 'empty' ? '-' : 'x';
    console.log(`  [${icon}] ${r.name}: ${r.count}개 행`);
  }

  if (hasError) {
    console.log('\n일부 테이블 동기화에 실패했습니다.');
    process.exit(1);
  } else {
    console.log('\n모든 테이블 동기화 완료!');
  }
}

main().catch((err) => {
  console.error('동기화 실패:', err.message);
  process.exit(1);
});
