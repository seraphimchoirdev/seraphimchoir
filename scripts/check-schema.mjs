#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const OLD_SUPABASE_URL = 'https://gjxvxcqujimkalloedbe.supabase.co';
const OLD_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqeHZ4Y3F1amlta2FsbG9lZGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ2NzgyMSwiZXhwIjoyMDc5MDQzODIxfQ.oWPUir4LEHs-OQp_jLZZMeW8T6Mw2CaIsGI9td4BB5g';

const NEW_SUPABASE_URL = 'https://vdlhfozbvcgomfgdtdvm.supabase.co';
const NEW_SERVICE_ROLE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!NEW_SERVICE_ROLE_KEY) {
  console.error('NEW_SUPABASE_SERVICE_ROLE_KEY 환경 변수를 설정해주세요.');
  process.exit(1);
}

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY);
const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY);

async function getTableColumns(supabase, tableName) {
  // 테이블에서 한 행을 가져와서 컬럼 확인
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (error) {
    console.error(`Error fetching ${tableName}:`, error);
    return [];
  }

  if (!data || data.length === 0) {
    // 빈 테이블인 경우 - 일단 NULL 체크로 모든 컬럼 시도
    console.log(`  ${tableName}: 빈 테이블`);
    return [];
  }

  return Object.keys(data[0]);
}

async function main() {
  const tables = ['members', 'service_schedules', 'arrangements', 'attendances', 'seats'];

  console.log('=== 스키마 비교 ===\n');

  for (const table of tables) {
    console.log(`[${table}]`);

    const oldCols = await getTableColumns(oldSupabase, table);
    const newCols = await getTableColumns(newSupabase, table);

    console.log(`  기존 프로젝트: ${oldCols.length}개 컬럼`);
    console.log(`  새 프로젝트: ${newCols.length}개 컬럼`);

    // 차이점 찾기
    const missingInNew = oldCols.filter(c => !newCols.includes(c));
    const extraInNew = newCols.filter(c => !oldCols.includes(c));

    if (missingInNew.length > 0) {
      console.log(`  ❌ 새 프로젝트에서 누락: ${missingInNew.join(', ')}`);
    }
    if (extraInNew.length > 0) {
      console.log(`  ➕ 새 프로젝트에만 존재: ${extraInNew.join(', ')}`);
    }
    if (missingInNew.length === 0 && extraInNew.length === 0) {
      console.log(`  ✅ 스키마 일치`);
    }
    console.log('');
  }
}

main().catch(console.error);
