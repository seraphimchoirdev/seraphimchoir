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

const supabase = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY);

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    // PostgreSQL array format
    const escaped = val.map(v => typeof v === 'string' ? `"${v.replace(/"/g, '\\"')}"` : v);
    return `'{${escaped.join(',')}}'`;
  }
  if (typeof val === 'object') {
    // JSON 타입
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  // 문자열
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

async function exportTable(tableName, orderBy = 'id') {
  console.log(`Exporting ${tableName}...`);

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
      console.error(`Error fetching ${tableName}:`, error);
      return '';
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      console.log(`  Fetched ${data.length} rows (total: ${allData.length})`);
      offset += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  if (allData.length === 0) {
    console.log(`  No data in ${tableName}`);
    return `-- ${tableName}: 데이터 없음\n`;
  }

  console.log(`  Total: ${allData.length} rows`);

  const columns = Object.keys(allData[0]);
  let sql = `-- ${tableName} 데이터 (${allData.length}개)\n`;
  sql += `-- 기존 데이터 삭제 (CASCADE로 관련 데이터도 삭제됨)\n`;
  sql += `TRUNCATE TABLE ${tableName} CASCADE;\n\n`;

  for (const row of allData) {
    const values = columns.map(col => escapeSQL(row[col]));
    sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
  }

  return sql + '\n';
}

async function main() {
  console.log('=== 데이터 내보내기 시작 ===\n');

  let allSQL = `-- Seraphim Choir 데이터 이관 SQL
-- 생성 시간: ${new Date().toISOString()}
-- 원본 프로젝트: gjxvxcqujimkalloedbe
-- 대상 프로젝트: vdlhfozbvcgomfgdtdvm

-- 외래 키 검사 비활성화
SET session_replication_role = 'replica';

`;

  // 테이블 순서 중요: 외래 키 의존성 순서대로
  const tables = [
    { name: 'members', orderBy: 'created_at' },
    { name: 'service_schedules', orderBy: 'date' },
    { name: 'arrangements', orderBy: 'created_at' },
    { name: 'attendances', orderBy: 'created_at' },
    { name: 'seats', orderBy: 'created_at' },
  ];

  for (const table of tables) {
    const sql = await exportTable(table.name, table.orderBy);
    allSQL += sql;
  }

  allSQL += `
-- 외래 키 검사 다시 활성화
SET session_replication_role = 'origin';

-- 시퀀스 재설정 (있는 경우)
-- PostgreSQL은 UUID 기본 키를 사용하므로 시퀀스 재설정 불필요
`;

  const outputPath = path.join(__dirname, '..', 'supabase', 'data_export.sql');
  fs.writeFileSync(outputPath, allSQL, 'utf-8');

  console.log(`\n=== 내보내기 완료 ===`);
  console.log(`출력 파일: ${outputPath}`);
}

main().catch(console.error);
