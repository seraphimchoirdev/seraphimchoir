#!/usr/bin/env npx tsx

/**
 * SOPRANO Row 4-5에서 튀는 col 값 분석
 */

import * as fs from 'fs';
import * as path from 'path';

const ML_OUTPUT_DIR = path.join(__dirname, '..', 'training_data', 'ml_output');
const START_DATE = '2025-02-10';
const END_DATE = '2026-01-14';
const VALID_SERVICES = ['2부예배', '2부주일예배'];

interface Seat {
  member_name: string;
  part: string;
  row: number;
  col: number;
}

interface MLData {
  date: string;
  metadata: { service: string };
  seats: Seat[];
}

const files = fs.readdirSync(ML_OUTPUT_DIR).filter(f => f.endsWith('.json'));

console.log('='.repeat(70));
console.log('SOPRANO Row 4-5에서 col이 높은 데이터 (튀는 값) 분석');
console.log('='.repeat(70));

// Row 4: 기존 max=8, Row 5: 기존 max=6
const outliers: { file: string; date: string; name: string; row: number; col: number }[] = [];

for (const file of files) {
  const data: MLData = JSON.parse(fs.readFileSync(path.join(ML_OUTPUT_DIR, file), 'utf-8'));

  // 날짜/서비스 필터
  if (data.date < START_DATE || data.date > END_DATE) continue;
  if (!VALID_SERVICES.includes(data.metadata.service)) continue;

  for (const seat of data.seats) {
    if (seat.part !== 'SOPRANO') continue;

    // Row 4에서 col > 8 또는 Row 5에서 col > 6
    if ((seat.row === 4 && seat.col > 8) || (seat.row === 5 && seat.col > 6)) {
      outliers.push({
        file,
        date: data.date,
        name: seat.member_name,
        row: seat.row,
        col: seat.col
      });
    }
  }
}

// Row별로 그룹화
const row4 = outliers.filter(o => o.row === 4).sort((a, b) => b.col - a.col);
const row5 = outliers.filter(o => o.row === 5).sort((a, b) => b.col - a.col);

console.log('\n### Row 4 (기존 max=8, 새 max=13) - col > 8인 케이스 ###\n');
console.log('| 날짜 | 멤버명 | Col | 파일명 |');
console.log('|------|--------|-----|--------|');
for (const o of row4) {
  console.log(`| ${o.date} | ${o.name} | ${o.col} | ${o.file} |`);
}
console.log(`\n총 ${row4.length}건`);

// 멤버별 빈도
const row4Members: Record<string, number> = {};
for (const o of row4) {
  row4Members[o.name] = (row4Members[o.name] || 0) + 1;
}
console.log('\nRow 4 멤버별 빈도:');
for (const [name, count] of Object.entries(row4Members).sort((a, b) => b[1] - a[1])) {
  console.log(`  - ${name}: ${count}회`);
}

console.log('\n### Row 5 (기존 max=6, 새 max=11) - col > 6인 케이스 ###\n');
console.log('| 날짜 | 멤버명 | Col | 파일명 |');
console.log('|------|--------|-----|--------|');
for (const o of row5) {
  console.log(`| ${o.date} | ${o.name} | ${o.col} | ${o.file} |`);
}
console.log(`\n총 ${row5.length}건`);

// 멤버별 빈도
const row5Members: Record<string, number> = {};
for (const o of row5) {
  row5Members[o.name] = (row5Members[o.name] || 0) + 1;
}
console.log('\nRow 5 멤버별 빈도:');
for (const [name, count] of Object.entries(row5Members).sort((a, b) => b[1] - a[1])) {
  console.log(`  - ${name}: ${count}회`);
}
