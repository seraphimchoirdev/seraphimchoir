/**
 * colRangeByRow 재학습 스크립트
 *
 * 2025-02-09 ~ 2026-01-11 기간의 2부예배/2부주일예배 데이터만으로
 * 열 패턴을 재분석하고 기존 DEFAULT_COL_RANGES와 비교합니다.
 *
 * 실행: npx tsx scripts/relearn-col-patterns.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// 타입 정의
type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';

interface Seat {
  member_id: string;
  member_name: string;
  part: Part;
  row: number;
  col: number;
}

interface MLOutputData {
  arrangement_id: string;
  date: string;
  metadata: {
    service: string;
    total_members: number;
  };
  grid_layout: {
    rows: number;
    row_capacities: number[];
  };
  seats: Seat[];
}

interface ColRange {
  min: number;
  max: number;
  avg: number;
  count: number;
}

// 기존 DEFAULT_COL_RANGES (비교용)
const EXISTING_COL_RANGES: Record<Part, { colRangeByRow: Record<number, { min: number; max: number; avg: number }>; avgCol: number }> = {
  SOPRANO: {
    colRangeByRow: {
      1: { min: 1, max: 9, avg: 4.5 },
      2: { min: 1, max: 10, avg: 4.8 },
      3: { min: 1, max: 10, avg: 5.0 },
      4: { min: 1, max: 8, avg: 4.0 },
      5: { min: 1, max: 6, avg: 3.5 },
      6: { min: 1, max: 5, avg: 3.0 },
    },
    avgCol: 4.6,
  },
  ALTO: {
    colRangeByRow: {
      1: { min: 6, max: 16, avg: 11.5 },
      2: { min: 6, max: 18, avg: 12.0 },
      3: { min: 8, max: 21, avg: 12.5 },
      4: { min: 8, max: 21, avg: 12.0 },
    },
    avgCol: 12.1,
  },
  TENOR: {
    colRangeByRow: {
      4: { min: 1, max: 10, avg: 4.0 },
      5: { min: 1, max: 10, avg: 4.2 },
      6: { min: 1, max: 7, avg: 3.8 },
    },
    avgCol: 4.4,
  },
  BASS: {
    colRangeByRow: {
      4: { min: 6, max: 20, avg: 10.5 },
      5: { min: 5, max: 17, avg: 10.0 },
      6: { min: 5, max: 15, avg: 9.5 },
    },
    avgCol: 10.0,
  },
  SPECIAL: {
    colRangeByRow: {},
    avgCol: 8,
  },
};

// 학습 기간 필터
const START_DATE = '2025-02-10';
const END_DATE = '2026-01-14';
const VALID_SERVICES = ['2부예배', '2부주일예배'];

// ml_output 디렉토리 경로
const ML_OUTPUT_DIR = path.join(__dirname, '..', 'training_data', 'ml_output');

function main() {
  console.log('='.repeat(70));
  console.log('colRangeByRow 재학습 분석');
  console.log('='.repeat(70));
  console.log(`학습 기간: ${START_DATE} ~ ${END_DATE}`);
  console.log(`대상 서비스: ${VALID_SERVICES.join(', ')}`);
  console.log('');

  // 1. ml_output 파일 로드 및 필터링
  const files = fs.readdirSync(ML_OUTPUT_DIR).filter(f => f.endsWith('.json'));
  console.log(`총 ml_output 파일: ${files.length}개`);

  const filteredData: MLOutputData[] = [];
  const excludedFiles: string[] = [];
  const includedFiles: string[] = [];

  for (const file of files) {
    const filePath = path.join(ML_OUTPUT_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data: MLOutputData = JSON.parse(content);

    // 날짜 필터
    if (data.date < START_DATE || data.date > END_DATE) {
      excludedFiles.push(`${file} (날짜: ${data.date})`);
      continue;
    }

    // 서비스 타입 필터
    if (!VALID_SERVICES.includes(data.metadata.service)) {
      excludedFiles.push(`${file} (서비스: ${data.metadata.service})`);
      continue;
    }

    filteredData.push(data);
    includedFiles.push(`${file} (${data.date}, ${data.metadata.total_members}명)`);
  }

  console.log(`\n포함된 파일: ${includedFiles.length}개`);
  console.log(`제외된 파일: ${excludedFiles.length}개`);

  console.log('\n--- 제외된 파일 목록 ---');
  excludedFiles.forEach(f => console.log(`  - ${f}`));

  console.log('\n--- 포함된 파일 목록 ---');
  includedFiles.forEach(f => console.log(`  + ${f}`));

  // 2. 파트별 열 데이터 수집
  const partColData: Record<Part, Record<number, number[]>> = {
    SOPRANO: {},
    ALTO: {},
    TENOR: {},
    BASS: {},
    SPECIAL: {},
  };

  let totalSeats = 0;
  for (const data of filteredData) {
    for (const seat of data.seats) {
      if (!partColData[seat.part]) continue;

      if (!partColData[seat.part][seat.row]) {
        partColData[seat.part][seat.row] = [];
      }
      partColData[seat.part][seat.row].push(seat.col);
      totalSeats++;
    }
  }

  console.log(`\n총 분석 좌석 수: ${totalSeats}개`);

  // 3. 새로운 colRangeByRow 계산
  const newColRanges: Record<Part, { colRangeByRow: Record<number, ColRange>; avgCol: number }> = {
    SOPRANO: { colRangeByRow: {}, avgCol: 0 },
    ALTO: { colRangeByRow: {}, avgCol: 0 },
    TENOR: { colRangeByRow: {}, avgCol: 0 },
    BASS: { colRangeByRow: {}, avgCol: 0 },
    SPECIAL: { colRangeByRow: {}, avgCol: 0 },
  };

  for (const part of ['SOPRANO', 'ALTO', 'TENOR', 'BASS'] as Part[]) {
    let totalColSum = 0;
    let totalCount = 0;

    for (const [rowStr, cols] of Object.entries(partColData[part])) {
      const row = Number(rowStr);
      if (cols.length === 0) continue;

      const min = Math.min(...cols);
      const max = Math.max(...cols);
      const avg = cols.reduce((a, b) => a + b, 0) / cols.length;

      newColRanges[part].colRangeByRow[row] = {
        min,
        max,
        avg: Math.round(avg * 100) / 100,
        count: cols.length,
      };

      totalColSum += cols.reduce((a, b) => a + b, 0);
      totalCount += cols.length;
    }

    newColRanges[part].avgCol = totalCount > 0
      ? Math.round((totalColSum / totalCount) * 100) / 100
      : 0;
  }

  // 4. 비교 출력
  console.log('\n' + '='.repeat(70));
  console.log('기존 vs 새 colRangeByRow 비교');
  console.log('='.repeat(70));

  for (const part of ['SOPRANO', 'ALTO', 'TENOR', 'BASS'] as Part[]) {
    console.log(`\n### ${part} ###`);
    console.log(`avgCol: 기존 ${EXISTING_COL_RANGES[part].avgCol} → 새값 ${newColRanges[part].avgCol}`);
    console.log('');
    console.log('Row | 기존 min | 기존 max | 기존 avg | 새 min | 새 max | 새 avg | 샘플수 | 변화');
    console.log('----|----------|----------|----------|--------|--------|--------|--------|------');

    // 모든 행 (1-6) 출력
    for (let row = 1; row <= 6; row++) {
      const existing = EXISTING_COL_RANGES[part].colRangeByRow[row];
      const newVal = newColRanges[part].colRangeByRow[row];

      const existMin = existing?.min ?? '-';
      const existMax = existing?.max ?? '-';
      const existAvg = existing?.avg ?? '-';

      const newMin = newVal?.min ?? '-';
      const newMax = newVal?.max ?? '-';
      const newAvg = newVal?.avg ?? '-';
      const count = newVal?.count ?? 0;

      // 변화량 계산
      let change = '';
      if (existing && newVal) {
        const minDiff = newVal.min - existing.min;
        const maxDiff = newVal.max - existing.max;
        if (minDiff !== 0 || maxDiff !== 0) {
          change = `min${minDiff >= 0 ? '+' : ''}${minDiff}, max${maxDiff >= 0 ? '+' : ''}${maxDiff}`;
        } else {
          change = '동일';
        }
      } else if (!existing && newVal) {
        change = '신규';
      } else if (existing && !newVal) {
        change = '삭제됨';
      }

      console.log(
        `${row.toString().padStart(3)} | ` +
        `${String(existMin).padStart(8)} | ` +
        `${String(existMax).padStart(8)} | ` +
        `${String(existAvg).padStart(8)} | ` +
        `${String(newMin).padStart(6)} | ` +
        `${String(newMax).padStart(6)} | ` +
        `${String(newAvg).padStart(6)} | ` +
        `${String(count).padStart(6)} | ` +
        change
      );
    }
  }

  // 5. 새로운 DEFAULT_COL_RANGES 코드 출력
  console.log('\n' + '='.repeat(70));
  console.log('새로운 DEFAULT_COL_RANGES (복사용)');
  console.log('='.repeat(70));
  console.log(`
const DEFAULT_COL_RANGES: Record<Part, { colRangeByRow: Record<number, ColRange>; avgCol: number }> = {
  SOPRANO: {
    colRangeByRow: {`);

  for (const [row, stats] of Object.entries(newColRanges.SOPRANO.colRangeByRow).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`      ${row}: { min: ${stats.min}, max: ${stats.max}, avg: ${stats.avg} },`);
  }

  console.log(`    },
    avgCol: ${newColRanges.SOPRANO.avgCol},
  },
  ALTO: {
    colRangeByRow: {`);

  for (const [row, stats] of Object.entries(newColRanges.ALTO.colRangeByRow).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`      ${row}: { min: ${stats.min}, max: ${stats.max}, avg: ${stats.avg} },`);
  }

  console.log(`    },
    avgCol: ${newColRanges.ALTO.avgCol},
  },
  TENOR: {
    colRangeByRow: {`);

  for (const [row, stats] of Object.entries(newColRanges.TENOR.colRangeByRow).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`      ${row}: { min: ${stats.min}, max: ${stats.max}, avg: ${stats.avg} },`);
  }

  console.log(`    },
    avgCol: ${newColRanges.TENOR.avgCol},
  },
  BASS: {
    colRangeByRow: {`);

  for (const [row, stats] of Object.entries(newColRanges.BASS.colRangeByRow).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`      ${row}: { min: ${stats.min}, max: ${stats.max}, avg: ${stats.avg} },`);
  }

  console.log(`    },
    avgCol: ${newColRanges.BASS.avgCol},
  },
  SPECIAL: {
    colRangeByRow: {},
    avgCol: 8,
  },
};`);
}

main();
