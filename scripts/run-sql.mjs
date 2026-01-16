#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const NEW_SUPABASE_URL = 'https://vdlhfozbvcgomfgdtdvm.supabase.co';
const NEW_SERVICE_ROLE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!NEW_SERVICE_ROLE_KEY) {
  console.error('NEW_SUPABASE_SERVICE_ROLE_KEY 환경 변수를 설정해주세요.');
  process.exit(1);
}

const supabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY, {
  db: { schema: 'public' }
});

async function main() {
  // 누락된 컬럼 추가
  console.log('=== 누락된 컬럼 추가 ===\n');

  const sqlStatements = [
    // members 테이블
    `ALTER TABLE members ADD COLUMN IF NOT EXISTS expected_return_date DATE`,

    // service_schedules 테이블
    `ALTER TABLE service_schedules ADD COLUMN IF NOT EXISTS composer TEXT`,
    `ALTER TABLE service_schedules ADD COLUMN IF NOT EXISTS music_source TEXT`,
    `ALTER TABLE service_schedules ADD COLUMN IF NOT EXISTS pre_practice_start_time TIME`,
  ];

  for (const sql of sqlStatements) {
    console.log(`실행: ${sql.substring(0, 60)}...`);
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // RPC가 없으면 무시 (REST API로는 DDL 실행 불가)
      console.log(`  경고: ${error.message}`);
    } else {
      console.log(`  성공`);
    }
  }
}

main().catch(console.error);
