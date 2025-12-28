#!/usr/bin/env npx tsx

/**
 * ML 학습 데이터 정합성 수정 스크립트
 *
 * seats 배열의 실제 데이터를 기준으로:
 * 1. total_members 수정
 * 2. breakdown 수정 (파트별 실제 인원수)
 * 3. row_capacities 수정
 * 4. grid_layout.rows 수정
 */

import * as fs from 'fs';
import * as path from 'path';

interface MlSeat {
  member_id: string | null;
  member_name: string;
  part: string;
  height: null;
  experience_years: number;
  is_part_leader: boolean;
  row: number;
  col: number;
}

interface MlData {
  arrangement_id: string;
  date: string;
  metadata: {
    service: string;
    anthem: string;
    offering_hymn_leader: string;
    total_members: number;
    breakdown: Record<string, number>;
  };
  grid_layout: {
    rows: number;
    row_capacities: number[];
    zigzag_pattern: string;
  };
  seats: MlSeat[];
}

// 파트명 정규화
function normalizePartName(part: string): string {
  const partMap: Record<string, string> = {
    SOPRANO: '소프라노',
    ALTO: '알토',
    TENOR: '테너',
    BASS: '베이스',
    소프라노: '소프라노',
    알토: '알토',
    테너: '테너',
    베이스: '베이스',
  };
  return partMap[part] || part;
}

function fixMlData(filePath: string): boolean {
  const fileName = path.basename(filePath);
  let modified = false;

  try {
    const data: MlData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 실제 seats 수
    const actualSeatsCount = data.seats.length;

    // 1. total_members 수정
    if (data.metadata.total_members !== actualSeatsCount) {
      console.log(
        `  [total_members] ${data.metadata.total_members} -> ${actualSeatsCount}`
      );
      data.metadata.total_members = actualSeatsCount;
      modified = true;
    }

    // 2. breakdown 수정 (파트별 실제 인원수 계산)
    const partCounts: Record<string, number> = {
      소프라노: 0,
      알토: 0,
      테너: 0,
      베이스: 0,
    };

    for (const seat of data.seats) {
      const normalizedPart = normalizePartName(seat.part);
      if (normalizedPart in partCounts) {
        partCounts[normalizedPart]++;
      }
    }

    const oldBreakdown = JSON.stringify(data.metadata.breakdown);
    const newBreakdown = JSON.stringify(partCounts);

    if (oldBreakdown !== newBreakdown) {
      console.log(`  [breakdown] ${oldBreakdown} -> ${newBreakdown}`);
      data.metadata.breakdown = partCounts;
      modified = true;
    }

    // 3. row_capacities 및 grid_layout.rows 수정
    const rowCounts: Record<number, number> = {};
    for (const seat of data.seats) {
      rowCounts[seat.row] = (rowCounts[seat.row] || 0) + 1;
    }

    const uniqueRows = Object.keys(rowCounts)
      .map(Number)
      .sort((a, b) => a - b);
    const actualRowCapacities = uniqueRows.map((row) => rowCounts[row]);
    const actualRowCount = uniqueRows.length;

    // row_capacities 수정
    const oldCapacities = JSON.stringify(data.grid_layout.row_capacities);
    const newCapacities = JSON.stringify(actualRowCapacities);

    if (oldCapacities !== newCapacities) {
      console.log(`  [row_capacities] ${oldCapacities} -> ${newCapacities}`);
      data.grid_layout.row_capacities = actualRowCapacities;
      modified = true;
    }

    // grid_layout.rows 수정
    if (data.grid_layout.rows !== actualRowCount) {
      console.log(
        `  [grid_layout.rows] ${data.grid_layout.rows} -> ${actualRowCount}`
      );
      data.grid_layout.rows = actualRowCount;
      modified = true;
    }

    // 수정된 경우 파일 저장
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    }
  } catch (error) {
    console.error(`Error processing ${fileName}:`, error);
  }

  return false;
}

async function main() {
  const mlOutputDir = path.join(
    __dirname,
    '..',
    'training_data',
    'ml_output'
  );

  const files = fs.readdirSync(mlOutputDir).filter((f) => f.endsWith('.json'));

  console.log(`\n=== ML 데이터 정합성 수정 ===\n`);
  console.log(`대상 파일: ${files.length}개\n`);

  let fixedCount = 0;

  for (const file of files) {
    const filePath = path.join(mlOutputDir, file);
    console.log(`처리 중: ${file}`);

    const wasFixed = fixMlData(filePath);
    if (wasFixed) {
      fixedCount++;
      console.log(`  ✓ 수정됨\n`);
    } else {
      console.log(`  - 변경 없음\n`);
    }
  }

  console.log(`\n=== 수정 완료 ===`);
  console.log(`수정된 파일: ${fixedCount}개\n`);
}

main().catch(console.error);
