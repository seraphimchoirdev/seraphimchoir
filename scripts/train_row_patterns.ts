#!/usr/bin/env npx tsx

/**
 * 행별 인원 분배 패턴 학습 스크립트
 *
 * ML 데이터에서 총 인원별 행 구성 패턴을 학습하여
 * row_distribution_patterns.json을 생성합니다.
 *
 * 사용법:
 *   npx tsx scripts/train_row_patterns.ts              # 모든 데이터로 학습
 *   npx tsx scripts/train_row_patterns.ts --filter "2부예배"  # 특정 예배만 학습
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

interface PatternData {
  rows: number;
  capacities: number[];
  observations: number;
}

interface AggregatedPattern {
  rows: number;
  capacitiesList: number[][];
  observations: number;
}

/**
 * 행별 인원 분배 패턴 학습
 */
function trainRowPatterns(files: string[]): Record<string, PatternData> {
  const patternsByTotal: Record<string, AggregatedPattern> = {};

  for (const file of files) {
    try {
      const data: MlData = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const totalMembers = data.seats.length;
      const rows = data.grid_layout.rows;
      const capacities = data.grid_layout.row_capacities;

      const key = totalMembers.toString();

      if (!patternsByTotal[key]) {
        patternsByTotal[key] = {
          rows,
          capacitiesList: [],
          observations: 0,
        };
      }

      patternsByTotal[key].capacitiesList.push(capacities);
      patternsByTotal[key].observations++;
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }

  // 패턴 집계 (평균 계산)
  const patterns: Record<string, PatternData> = {};

  for (const [total, aggPattern] of Object.entries(patternsByTotal)) {
    // 가장 빈번한 행 수 선택
    const rowCounts = aggPattern.capacitiesList.map((c) => c.length);
    const mostCommonRows = mode(rowCounts);

    // 해당 행 수의 패턴만 필터링
    const filteredCapacities = aggPattern.capacitiesList.filter(
      (c) => c.length === mostCommonRows
    );

    if (filteredCapacities.length === 0) continue;

    // 각 행의 평균 인원 계산
    const avgCapacities: number[] = [];
    for (let i = 0; i < mostCommonRows; i++) {
      const values = filteredCapacities.map((c) => c[i] || 0);
      avgCapacities.push(Math.round(mean(values)));
    }

    // 합계가 total과 맞도록 조정
    let sum = avgCapacities.reduce((a, b) => a + b, 0);
    let diff = Number(total) - sum;

    // 차이를 앞쪽 행부터 분배
    let idx = 0;
    while (diff !== 0) {
      if (diff > 0) {
        avgCapacities[idx % mostCommonRows]++;
        diff--;
      } else {
        avgCapacities[idx % mostCommonRows]--;
        diff++;
      }
      idx++;
    }

    patterns[total] = {
      rows: mostCommonRows,
      capacities: avgCapacities,
      observations: filteredCapacities.length,
    };
  }

  // 총 인원 순으로 정렬
  const sortedPatterns: Record<string, PatternData> = {};
  const sortedKeys = Object.keys(patterns)
    .map(Number)
    .sort((a, b) => a - b);

  for (const key of sortedKeys) {
    sortedPatterns[key.toString()] = patterns[key.toString()];
  }

  return sortedPatterns;
}

/**
 * 최빈값 계산
 */
function mode(arr: number[]): number {
  const counts = new Map<number, number>();
  for (const val of arr) {
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  let maxCount = 0;
  let modeVal = arr[0];
  for (const [val, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      modeVal = val;
    }
  }
  return modeVal;
}

/**
 * 평균 계산
 */
function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function main() {
  const args = process.argv.slice(2);
  let filter: string | null = null;

  // 필터 파싱
  const filterIndex = args.indexOf('--filter');
  if (filterIndex !== -1 && args[filterIndex + 1]) {
    filter = args[filterIndex + 1];
  }

  const mlOutputDir = path.join(__dirname, '..', 'training_data', 'ml_output');
  let files = fs.readdirSync(mlOutputDir).filter((f) => f.endsWith('.json'));

  // 필터 적용
  if (filter) {
    files = files.filter((f) => f.includes(filter));
    console.log(`\n=== "${filter}" 데이터로 행 패턴 학습 ===\n`);
  } else {
    console.log(`\n=== 모든 데이터로 행 패턴 학습 ===\n`);
  }

  console.log(`학습 데이터: ${files.length}개 파일\n`);

  if (files.length === 0) {
    console.error('학습할 파일이 없습니다.');
    process.exit(1);
  }

  const filePaths = files.map((f) => path.join(mlOutputDir, f));
  const patterns = trainRowPatterns(filePaths);

  // 패턴 통계 출력
  console.log(`생성된 패턴: ${Object.keys(patterns).length}개\n`);
  console.log('=== 패턴 목록 ===\n');

  let totalObservations = 0;
  for (const [total, pattern] of Object.entries(patterns)) {
    console.log(
      `${total}명: ${pattern.rows}행 [${pattern.capacities.join(', ')}] (${pattern.observations}건)`
    );
    totalObservations += pattern.observations;
  }

  console.log(`\n총 관측 데이터: ${totalObservations}건`);

  // 파일 저장
  const outputPath = path.join(
    __dirname,
    '..',
    'training_data',
    'row_distribution_patterns.json'
  );

  // 백업 생성
  if (fs.existsSync(outputPath)) {
    const backupPath = outputPath.replace('.json', '.backup.json');
    fs.copyFileSync(outputPath, backupPath);
    console.log(`\n기존 패턴 백업: ${backupPath}`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(patterns, null, 2), 'utf-8');
  console.log(`\n패턴 저장 완료: ${outputPath}`);

  console.log(`\n=== 학습 완료 ===\n`);
}

main().catch(console.error);
