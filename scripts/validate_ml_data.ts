#!/usr/bin/env npx tsx

/**
 * ML 학습 데이터 정합성 검증 스크립트
 *
 * 검증 항목:
 * 1. total_members vs seats 배열의 실제 개수
 * 2. breakdown 합계 vs seats 배열의 실제 개수
 * 3. row_capacities vs 각 row별 실제 seats 수
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

interface ValidationError {
  file: string;
  type: 'total_members' | 'breakdown' | 'row_capacities';
  expected: number | number[];
  actual: number | number[];
  details?: string;
}

function validateMlData(filePath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const fileName = path.basename(filePath);

  try {
    const data: MlData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 1. total_members vs seats 배열 개수
    const actualSeatsCount = data.seats.length;
    if (data.metadata.total_members !== actualSeatsCount) {
      errors.push({
        file: fileName,
        type: 'total_members',
        expected: data.metadata.total_members,
        actual: actualSeatsCount,
        details: `metadata.total_members(${data.metadata.total_members}) != seats.length(${actualSeatsCount})`,
      });
    }

    // 2. breakdown 합계 vs seats 배열 개수
    const breakdownTotal = Object.values(data.metadata.breakdown).reduce(
      (sum, val) => sum + val,
      0
    );
    if (breakdownTotal !== actualSeatsCount) {
      errors.push({
        file: fileName,
        type: 'breakdown',
        expected: breakdownTotal,
        actual: actualSeatsCount,
        details: `breakdown 합계(${breakdownTotal}) != seats.length(${actualSeatsCount})`,
      });
    }

    // 3. row_capacities vs 각 row별 실제 seats 수
    const rowCounts: Record<number, number> = {};
    for (const seat of data.seats) {
      rowCounts[seat.row] = (rowCounts[seat.row] || 0) + 1;
    }

    // row_capacities 배열과 비교 (index 0 = row 1)
    const actualRowCapacities: number[] = [];
    for (let i = 0; i < data.grid_layout.row_capacities.length; i++) {
      const rowNum = i + 1;
      actualRowCapacities.push(rowCounts[rowNum] || 0);
    }

    const capacitiesMatch =
      JSON.stringify(data.grid_layout.row_capacities) ===
      JSON.stringify(actualRowCapacities);

    if (!capacitiesMatch) {
      errors.push({
        file: fileName,
        type: 'row_capacities',
        expected: data.grid_layout.row_capacities,
        actual: actualRowCapacities,
        details: `row_capacities 불일치`,
      });
    }

    // 추가 검증: grid_layout.rows vs 실제 row 개수
    const uniqueRows = new Set(data.seats.map((s) => s.row));
    if (data.grid_layout.rows !== uniqueRows.size) {
      errors.push({
        file: fileName,
        type: 'row_capacities',
        expected: data.grid_layout.rows,
        actual: uniqueRows.size,
        details: `grid_layout.rows(${data.grid_layout.rows}) != 실제 row 개수(${uniqueRows.size})`,
      });
    }
  } catch (error) {
    console.error(`Error parsing ${fileName}:`, error);
  }

  return errors;
}

async function main() {
  const mlOutputDir = path.join(
    __dirname,
    '..',
    'training_data',
    'ml_output'
  );

  const files = fs.readdirSync(mlOutputDir).filter((f) => f.endsWith('.json'));

  console.log(`\n=== ML 데이터 정합성 검증 ===\n`);
  console.log(`검증 대상 파일: ${files.length}개\n`);

  const allErrors: ValidationError[] = [];
  let validCount = 0;

  for (const file of files) {
    const filePath = path.join(mlOutputDir, file);
    const errors = validateMlData(filePath);

    if (errors.length === 0) {
      validCount++;
    } else {
      allErrors.push(...errors);
    }
  }

  // 결과 출력
  console.log(`✓ 정상 파일: ${validCount}개`);
  console.log(`✗ 오류 파일: ${files.length - validCount}개`);

  if (allErrors.length > 0) {
    console.log(`\n=== 오류 상세 ===\n`);

    // 오류 유형별 그룹화
    const errorsByType: Record<string, ValidationError[]> = {
      total_members: [],
      breakdown: [],
      row_capacities: [],
    };

    for (const error of allErrors) {
      errorsByType[error.type].push(error);
    }

    // total_members 오류
    if (errorsByType.total_members.length > 0) {
      console.log(`\n[1] total_members 불일치 (${errorsByType.total_members.length}건):`);
      for (const e of errorsByType.total_members) {
        console.log(`  - ${e.file}: expected=${e.expected}, actual=${e.actual}`);
      }
    }

    // breakdown 오류
    if (errorsByType.breakdown.length > 0) {
      console.log(`\n[2] breakdown 합계 불일치 (${errorsByType.breakdown.length}건):`);
      for (const e of errorsByType.breakdown) {
        console.log(`  - ${e.file}: breakdown합계=${e.expected}, seats수=${e.actual}`);
      }
    }

    // row_capacities 오류
    if (errorsByType.row_capacities.length > 0) {
      console.log(`\n[3] row_capacities 불일치 (${errorsByType.row_capacities.length}건):`);
      for (const e of errorsByType.row_capacities) {
        console.log(`  - ${e.file}:`);
        console.log(`    expected: ${JSON.stringify(e.expected)}`);
        console.log(`    actual:   ${JSON.stringify(e.actual)}`);
      }
    }
  }

  console.log(`\n=== 검증 완료 ===\n`);
}

main().catch(console.error);
