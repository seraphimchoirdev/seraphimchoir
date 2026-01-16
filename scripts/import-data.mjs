#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 기존 프로젝트 접속 정보
const OLD_SUPABASE_URL = 'https://gjxvxcqujimkalloedbe.supabase.co';
const OLD_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqeHZ4Y3F1amlta2FsbG9lZGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ2NzgyMSwiZXhwIjoyMDc5MDQzODIxfQ.oWPUir4LEHs-OQp_jLZZMeW8T6Mw2CaIsGI9td4BB5g';

// 새 프로젝트 접속 정보
const NEW_SUPABASE_URL = 'https://vdlhfozbvcgomfgdtdvm.supabase.co';
// 새 프로젝트의 Service Role Key가 필요합니다 (아래에 입력)
const NEW_SERVICE_ROLE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!NEW_SERVICE_ROLE_KEY) {
  console.error('NEW_SUPABASE_SERVICE_ROLE_KEY 환경 변수를 설정해주세요.');
  console.error('사용법: NEW_SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/import-data.mjs');
  process.exit(1);
}

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY);
const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY);

const BATCH_SIZE = 500;

// 새 프로젝트에서 누락된 컬럼 (마이그레이션 적용 후 비움)
const EXCLUDED_COLUMNS = {
  members: [],  // 모든 컬럼 이관
  service_schedules: [],  // 모든 컬럼 이관
};

function filterColumns(tableName, data) {
  const excludedCols = EXCLUDED_COLUMNS[tableName] || [];
  if (excludedCols.length === 0) return data;

  return data.map(row => {
    const filtered = { ...row };
    for (const col of excludedCols) {
      delete filtered[col];
    }
    return filtered;
  });
}

async function fetchAllData(supabase, tableName, orderBy = 'created_at') {
  console.log(`  ${tableName} 데이터 가져오는 중...`);

  const PAGE_SIZE = 1000;
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
      console.error(`  Error fetching ${tableName}:`, error);
      return [];
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      offset += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  console.log(`  ${tableName}: ${allData.length}개 행 로드됨`);
  return allData;
}

async function insertData(supabase, tableName, data) {
  if (!data || data.length === 0) {
    console.log(`  ${tableName}: 삽입할 데이터 없음`);
    return true;
  }

  console.log(`  ${tableName}에 ${data.length}개 행 삽입 중...`);

  // 배치로 삽입
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.error(`  ${tableName} 삽입 오류 (배치 ${Math.floor(i/BATCH_SIZE) + 1}):`, error);
      return false;
    }
    process.stdout.write(`\r  ${tableName}: ${Math.min(i + BATCH_SIZE, data.length)}/${data.length} 행 완료`);
  }
  console.log(`\n  ${tableName}: 삽입 완료`);
  return true;
}

async function clearTable(supabase, tableName) {
  console.log(`  ${tableName} 기존 데이터 삭제 중...`);

  // RPC를 사용하여 TRUNCATE 실행
  const { error } = await supabase.rpc('truncate_table', { table_name: tableName });

  if (error) {
    // RPC가 없으면 DELETE로 시도
    console.log(`  TRUNCATE RPC 없음, DELETE로 시도...`);
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 행 삭제

    if (deleteError) {
      console.error(`  ${tableName} 삭제 오류:`, deleteError);
      return false;
    }
  }

  console.log(`  ${tableName}: 삭제 완료`);
  return true;
}

async function migrateTable(tableName, orderBy = 'created_at') {
  console.log(`\n[${tableName}] 마이그레이션 시작`);

  // 1. 기존 프로젝트에서 데이터 가져오기
  let data = await fetchAllData(oldSupabase, tableName, orderBy);

  if (data.length === 0) {
    console.log(`[${tableName}] 마이그레이션 완료 (데이터 없음)`);
    return true;
  }

  // 2. 누락된 컬럼 필터링
  data = filterColumns(tableName, data);
  const excludedCols = EXCLUDED_COLUMNS[tableName] || [];
  if (excludedCols.length > 0) {
    console.log(`  제외된 컬럼: ${excludedCols.join(', ')}`);
  }

  // 3. 기존 데이터 삭제 (upsert가 작동하지 않는 경우를 대비)
  console.log(`  기존 데이터 확인 중...`);
  const { count } = await newSupabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  if (count > 0) {
    console.log(`  기존 데이터 ${count}개 존재 - upsert로 덮어씁니다.`);
  }

  // 4. 새 프로젝트에 데이터 삽입
  const success = await insertData(newSupabase, tableName, data);

  if (success) {
    console.log(`[${tableName}] 마이그레이션 완료: ${data.length}개 행`);
  } else {
    console.log(`[${tableName}] 마이그레이션 실패`);
  }

  return success;
}

async function main() {
  console.log('=== 데이터 마이그레이션 시작 ===');
  console.log(`원본: ${OLD_SUPABASE_URL}`);
  console.log(`대상: ${NEW_SUPABASE_URL}`);
  console.log('');

  // 테이블 순서: 외래 키 의존성 고려
  const tables = [
    { name: 'members', orderBy: 'created_at' },
    { name: 'service_schedules', orderBy: 'date' },
    { name: 'arrangements', orderBy: 'created_at' },
    { name: 'attendances', orderBy: 'created_at' },
    { name: 'seats', orderBy: 'created_at' },
  ];

  let allSuccess = true;

  for (const table of tables) {
    const success = await migrateTable(table.name, table.orderBy);
    if (!success) {
      allSuccess = false;
    }
  }

  console.log('\n=== 마이그레이션 완료 ===');
  if (allSuccess) {
    console.log('모든 테이블이 성공적으로 마이그레이션되었습니다.');
  } else {
    console.log('일부 테이블 마이그레이션에 실패했습니다.');
    process.exit(1);
  }
}

main().catch(console.error);
