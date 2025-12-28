#!/usr/bin/env npx tsx

/**
 * AI 자리배치 패턴 종합 학습 스크립트
 *
 * ML 데이터에서 다음 패턴들을 학습합니다:
 * 1. 파트별 좌우 분포 (SOPRANO/TENOR는 왼쪽, ALTO/BASS는 오른쪽)
 * 2. 파트별 행 분포 (앞/뒤 행 선호도)
 * 3. 대원별 고정석 패턴 (선호 좌석 위치)
 *
 * 사용법:
 *   npx tsx scripts/train_seat_patterns.ts              # 모든 데이터로 학습
 *   npx tsx scripts/train_seat_patterns.ts --filter "2부예배"  # 특정 예배만 학습
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

// ===== 1. 파트별 좌우 분포 분석 =====
interface PartSideDistribution {
  part: string;
  leftCount: number;
  rightCount: number;
  leftPercentage: number;
  totalObservations: number;
}

// ===== 2. 파트별 행 분포 분석 =====
interface PartRowDistribution {
  part: string;
  rowDistribution: Record<number, number>; // row -> count
  preferredRows: number[]; // 선호 행 (상위 3개)
  frontRowPercentage: number; // 1-3행 비율
  backRowPercentage: number; // 4-6행 비율
  totalObservations: number;
}

// ===== 3. 대원별 고정석 패턴 =====
interface MemberSeatPattern {
  member_id: string;
  member_name: string;
  part: string;
  positions: Array<{ row: number; col: number; date: string }>;
  preferredRow: number;
  preferredCol: number;
  rowConsistency: number; // 0-1 (같은 행에 앉는 비율)
  colConsistency: number; // 0-1 (±2열 범위에 앉는 비율)
  isFixedSeat: boolean; // 고정석 여부 (row/col 모두 80%+ 일관성)
  totalAppearances: number;
}

// ===== 학습 결과 =====
interface TrainingResult {
  summary: {
    totalFiles: number;
    totalSeats: number;
    uniqueMembers: number;
    dateRange: { start: string; end: string };
  };
  partSideDistribution: PartSideDistribution[];
  partRowDistribution: PartRowDistribution[];
  memberPatterns: MemberSeatPattern[];
  fixedSeatStats: {
    totalMembers: number;
    fixedSeatMembers: number;
    fixedSeatPercentage: number;
    avgRowConsistency: number;
    avgColConsistency: number;
  };
}

/**
 * 파트명 정규화
 */
function normalizePartName(part: string): string {
  const partMap: Record<string, string> = {
    SOPRANO: 'SOPRANO',
    ALTO: 'ALTO',
    TENOR: 'TENOR',
    BASS: 'BASS',
    소프라노: 'SOPRANO',
    알토: 'ALTO',
    테너: 'TENOR',
    베이스: 'BASS',
  };
  return partMap[part] || part;
}

/**
 * 좌우 위치 판단 (중앙 기준)
 */
function getSide(col: number, rowCapacity: number): 'left' | 'right' {
  const center = (rowCapacity + 1) / 2;
  return col <= center ? 'left' : 'right';
}

/**
 * 파트별 좌우 분포 분석
 */
function analyzePartSideDistribution(
  allSeats: Array<MlSeat & { rowCapacity: number }>
): PartSideDistribution[] {
  const partStats: Record<string, { left: number; right: number }> = {
    SOPRANO: { left: 0, right: 0 },
    ALTO: { left: 0, right: 0 },
    TENOR: { left: 0, right: 0 },
    BASS: { left: 0, right: 0 },
  };

  for (const seat of allSeats) {
    const part = normalizePartName(seat.part);
    if (!(part in partStats)) continue;

    const side = getSide(seat.col, seat.rowCapacity);
    partStats[part][side]++;
  }

  return Object.entries(partStats).map(([part, stats]) => {
    const total = stats.left + stats.right;
    return {
      part,
      leftCount: stats.left,
      rightCount: stats.right,
      leftPercentage: total > 0 ? (stats.left / total) * 100 : 0,
      totalObservations: total,
    };
  });
}

/**
 * 파트별 행 분포 분석
 */
function analyzePartRowDistribution(
  allSeats: Array<MlSeat & { totalRows: number }>
): PartRowDistribution[] {
  const partRowStats: Record<string, Record<number, number>> = {
    SOPRANO: {},
    ALTO: {},
    TENOR: {},
    BASS: {},
  };

  for (const seat of allSeats) {
    const part = normalizePartName(seat.part);
    if (!(part in partRowStats)) continue;

    partRowStats[part][seat.row] = (partRowStats[part][seat.row] || 0) + 1;
  }

  return Object.entries(partRowStats).map(([part, rowDist]) => {
    const total = Object.values(rowDist).reduce((a, b) => a + b, 0);

    // 선호 행 (상위 3개)
    const sortedRows = Object.entries(rowDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([row]) => Number(row));

    // 앞줄(1-3행) / 뒷줄(4-6행) 비율
    let frontCount = 0;
    let backCount = 0;
    for (const [row, count] of Object.entries(rowDist)) {
      if (Number(row) <= 3) frontCount += count;
      else backCount += count;
    }

    return {
      part,
      rowDistribution: rowDist,
      preferredRows: sortedRows,
      frontRowPercentage: total > 0 ? (frontCount / total) * 100 : 0,
      backRowPercentage: total > 0 ? (backCount / total) * 100 : 0,
      totalObservations: total,
    };
  });
}

/**
 * 대원별 고정석 패턴 분석
 */
function analyzeMemberPatterns(
  allSeats: Array<MlSeat & { date: string }>
): MemberSeatPattern[] {
  // 대원별 좌석 이력 집계
  const memberHistory: Record<
    string,
    {
      name: string;
      part: string;
      positions: Array<{ row: number; col: number; date: string }>;
    }
  > = {};

  for (const seat of allSeats) {
    if (!seat.member_id) continue;

    if (!memberHistory[seat.member_id]) {
      memberHistory[seat.member_id] = {
        name: seat.member_name,
        part: normalizePartName(seat.part),
        positions: [],
      };
    }

    memberHistory[seat.member_id].positions.push({
      row: seat.row,
      col: seat.col,
      date: seat.date,
    });
  }

  // 패턴 분석
  const patterns: MemberSeatPattern[] = [];
  const COL_TOLERANCE = 2;
  const HIGH_CONSISTENCY = 0.8;
  const MIN_APPEARANCES = 3;

  for (const [memberId, history] of Object.entries(memberHistory)) {
    if (history.positions.length < MIN_APPEARANCES) continue;

    const rows = history.positions.map((p) => p.row);
    const cols = history.positions.map((p) => p.col);

    // 가장 많이 앉은 행
    const rowCounts = new Map<number, number>();
    for (const row of rows) {
      rowCounts.set(row, (rowCounts.get(row) || 0) + 1);
    }
    let preferredRow = rows[0];
    let maxRowCount = 0;
    for (const [row, count] of rowCounts) {
      if (count > maxRowCount) {
        maxRowCount = count;
        preferredRow = row;
      }
    }

    // 행 일관성
    const rowConsistency = maxRowCount / rows.length;

    // 평균 열 위치
    const avgCol = cols.reduce((a, b) => a + b, 0) / cols.length;
    const preferredCol = Math.round(avgCol);

    // 열 일관성 (±2열 범위)
    const colsInRange = cols.filter(
      (c) => Math.abs(c - avgCol) <= COL_TOLERANCE
    ).length;
    const colConsistency = colsInRange / cols.length;

    // 고정석 여부
    const isFixedSeat =
      rowConsistency >= HIGH_CONSISTENCY && colConsistency >= HIGH_CONSISTENCY;

    patterns.push({
      member_id: memberId,
      member_name: history.name,
      part: history.part,
      positions: history.positions,
      preferredRow,
      preferredCol,
      rowConsistency,
      colConsistency,
      isFixedSeat,
      totalAppearances: history.positions.length,
    });
  }

  // 출석 횟수 기준 정렬
  return patterns.sort((a, b) => b.totalAppearances - a.totalAppearances);
}

/**
 * 메인 학습 함수
 */
function trainSeatPatterns(files: string[]): TrainingResult {
  const allSeatsWithCapacity: Array<MlSeat & { rowCapacity: number }> = [];
  const allSeatsWithRows: Array<MlSeat & { totalRows: number }> = [];
  const allSeatsWithDate: Array<MlSeat & { date: string }> = [];
  const dates: string[] = [];

  let totalSeats = 0;

  for (const file of files) {
    try {
      const data: MlData = JSON.parse(fs.readFileSync(file, 'utf-8'));
      dates.push(data.date);
      totalSeats += data.seats.length;

      for (const seat of data.seats) {
        // row_capacities에서 해당 행의 capacity 찾기
        const rowCapacity = data.grid_layout.row_capacities[seat.row - 1] || 15;

        allSeatsWithCapacity.push({ ...seat, rowCapacity });
        allSeatsWithRows.push({ ...seat, totalRows: data.grid_layout.rows });
        allSeatsWithDate.push({ ...seat, date: data.date });
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }

  // 분석 실행
  const partSideDistribution = analyzePartSideDistribution(allSeatsWithCapacity);
  const partRowDistribution = analyzePartRowDistribution(allSeatsWithRows);
  const memberPatterns = analyzeMemberPatterns(allSeatsWithDate);

  // 고정석 통계
  const fixedSeatMembers = memberPatterns.filter((p) => p.isFixedSeat);
  const avgRowConsistency =
    memberPatterns.length > 0
      ? memberPatterns.reduce((sum, p) => sum + p.rowConsistency, 0) /
        memberPatterns.length
      : 0;
  const avgColConsistency =
    memberPatterns.length > 0
      ? memberPatterns.reduce((sum, p) => sum + p.colConsistency, 0) /
        memberPatterns.length
      : 0;

  // 날짜 정렬
  dates.sort();

  return {
    summary: {
      totalFiles: files.length,
      totalSeats,
      uniqueMembers: memberPatterns.length,
      dateRange: {
        start: dates[0] || '',
        end: dates[dates.length - 1] || '',
      },
    },
    partSideDistribution,
    partRowDistribution,
    memberPatterns,
    fixedSeatStats: {
      totalMembers: memberPatterns.length,
      fixedSeatMembers: fixedSeatMembers.length,
      fixedSeatPercentage:
        memberPatterns.length > 0
          ? (fixedSeatMembers.length / memberPatterns.length) * 100
          : 0,
      avgRowConsistency: avgRowConsistency * 100,
      avgColConsistency: avgColConsistency * 100,
    },
  };
}

/**
 * 결과 출력
 */
function printResults(result: TrainingResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('              AI 자리배치 패턴 학습 결과');
  console.log('='.repeat(60));

  // 요약
  console.log('\n【 학습 데이터 요약 】');
  console.log(`  - 학습 파일: ${result.summary.totalFiles}개`);
  console.log(`  - 총 좌석 데이터: ${result.summary.totalSeats}건`);
  console.log(`  - 고유 대원 수: ${result.summary.uniqueMembers}명`);
  console.log(
    `  - 기간: ${result.summary.dateRange.start} ~ ${result.summary.dateRange.end}`
  );

  // 파트별 좌우 분포
  console.log('\n【 1. 파트별 좌우 분포 】');
  console.log('  ┌────────────┬────────┬────────┬──────────┐');
  console.log('  │    파트    │  왼쪽  │ 오른쪽 │ 왼쪽비율 │');
  console.log('  ├────────────┼────────┼────────┼──────────┤');
  for (const dist of result.partSideDistribution) {
    console.log(
      `  │ ${dist.part.padEnd(10)} │ ${String(dist.leftCount).padStart(6)} │ ${String(dist.rightCount).padStart(6)} │ ${dist.leftPercentage.toFixed(1).padStart(7)}% │`
    );
  }
  console.log('  └────────────┴────────┴────────┴──────────┘');

  // 파트별 행 분포
  console.log('\n【 2. 파트별 행 분포 】');
  console.log('  ┌────────────┬──────────┬──────────┬────────────────┐');
  console.log('  │    파트    │ 앞(1-3) │ 뒤(4-6) │   선호 행      │');
  console.log('  ├────────────┼──────────┼──────────┼────────────────┤');
  for (const dist of result.partRowDistribution) {
    console.log(
      `  │ ${dist.part.padEnd(10)} │ ${dist.frontRowPercentage.toFixed(1).padStart(7)}% │ ${dist.backRowPercentage.toFixed(1).padStart(7)}% │ ${dist.preferredRows.join(', ').padEnd(14)} │`
    );
  }
  console.log('  └────────────┴──────────┴──────────┴────────────────┘');

  // 고정석 통계
  console.log('\n【 3. 고정석 패턴 통계 】');
  console.log(`  - 분석 대원: ${result.fixedSeatStats.totalMembers}명`);
  console.log(
    `  - 고정석 대원: ${result.fixedSeatStats.fixedSeatMembers}명 (${result.fixedSeatStats.fixedSeatPercentage.toFixed(1)}%)`
  );
  console.log(
    `  - 평균 행 일관성: ${result.fixedSeatStats.avgRowConsistency.toFixed(1)}%`
  );
  console.log(
    `  - 평균 열 일관성: ${result.fixedSeatStats.avgColConsistency.toFixed(1)}%`
  );

  // 고정석 대원 목록 (상위 10명)
  const fixedMembers = result.memberPatterns
    .filter((p) => p.isFixedSeat)
    .slice(0, 10);

  if (fixedMembers.length > 0) {
    console.log('\n  [고정석 대원 TOP 10]');
    console.log(
      '  ┌──────────┬──────────┬────────┬────────┬──────────┬──────────┐'
    );
    console.log(
      '  │   이름   │   파트   │선호 행 │선호 열 │행 일관성 │열 일관성 │'
    );
    console.log(
      '  ├──────────┼──────────┼────────┼────────┼──────────┼──────────┤'
    );
    for (const member of fixedMembers) {
      console.log(
        `  │ ${member.member_name.padEnd(8)} │ ${member.part.padEnd(8)} │ ${String(member.preferredRow).padStart(6)} │ ${String(member.preferredCol).padStart(6)} │ ${(member.rowConsistency * 100).toFixed(0).padStart(7)}% │ ${(member.colConsistency * 100).toFixed(0).padStart(7)}% │`
      );
    }
    console.log(
      '  └──────────┴──────────┴────────┴────────┴──────────┴──────────┘'
    );
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * 학습 결과를 알고리즘 설정 파일로 저장
 */
function saveAlgorithmConfig(result: TrainingResult, outputDir: string): void {
  // 1. 파트별 배치 규칙 생성
  const partPlacementRules: Record<
    string,
    {
      side: 'left' | 'right';
      preferredRows: number[];
      overflowRows: number[];
      sidePercentage: number;
      frontRowPercentage: number;
    }
  > = {};

  for (const sideDist of result.partSideDistribution) {
    const rowDist = result.partRowDistribution.find(
      (r) => r.part === sideDist.part
    );
    if (!rowDist) continue;

    const side = sideDist.leftPercentage > 50 ? 'left' : 'right';

    // 선호 행 결정 (앞줄 우선 vs 뒷줄 우선)
    let preferredRows: number[];
    let overflowRows: number[];

    if (rowDist.frontRowPercentage > 60) {
      preferredRows = [1, 2, 3];
      overflowRows = sideDist.part === 'ALTO' ? [4] : [4, 5, 6]; // 알토는 4행까지만
    } else if (rowDist.backRowPercentage > 60) {
      preferredRows = [4, 5, 6];
      overflowRows = [];
    } else {
      preferredRows = rowDist.preferredRows;
      overflowRows = [];
    }

    partPlacementRules[sideDist.part] = {
      side,
      preferredRows,
      overflowRows,
      sidePercentage: side === 'left' ? sideDist.leftPercentage : 100 - sideDist.leftPercentage,
      frontRowPercentage: rowDist.frontRowPercentage,
    };
  }

  // 2. 대원별 선호 좌석 저장 (고정석 대원만)
  const memberPreferences = result.memberPatterns
    .filter((p) => p.isFixedSeat || p.totalAppearances >= 5)
    .map((p) => ({
      member_id: p.member_id,
      member_name: p.member_name,
      part: p.part,
      preferred_row: p.preferredRow,
      preferred_col: p.preferredCol,
      row_consistency: Math.round(p.rowConsistency * 100),
      col_consistency: Math.round(p.colConsistency * 100),
      is_fixed_seat: p.isFixedSeat,
      total_appearances: p.totalAppearances,
    }));

  // 설정 파일 저장
  const config = {
    generated_at: new Date().toISOString(),
    training_summary: result.summary,
    part_placement_rules: partPlacementRules,
    fixed_seat_stats: result.fixedSeatStats,
  };

  const configPath = path.join(outputDir, 'seat_algorithm_config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`알고리즘 설정 저장: ${configPath}`);

  // 대원별 선호 좌석 저장
  const preferencesPath = path.join(outputDir, 'member_seat_preferences.json');
  fs.writeFileSync(
    preferencesPath,
    JSON.stringify(memberPreferences, null, 2),
    'utf-8'
  );
  console.log(`대원 선호 좌석 저장: ${preferencesPath}`);
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
  const trainingDataDir = path.join(__dirname, '..', 'training_data');

  let files = fs.readdirSync(mlOutputDir).filter((f) => f.endsWith('.json'));

  // 필터 적용
  if (filter) {
    files = files.filter((f) => f.includes(filter));
    console.log(`\n=== "${filter}" 데이터로 AI 자리배치 패턴 학습 ===\n`);
  } else {
    console.log(`\n=== 모든 데이터로 AI 자리배치 패턴 학습 ===\n`);
  }

  console.log(`학습 데이터: ${files.length}개 파일\n`);

  if (files.length === 0) {
    console.error('학습할 파일이 없습니다.');
    process.exit(1);
  }

  const filePaths = files.map((f) => path.join(mlOutputDir, f));

  // 학습 실행
  const result = trainSeatPatterns(filePaths);

  // 결과 출력
  printResults(result);

  // 설정 파일 저장
  saveAlgorithmConfig(result, trainingDataDir);

  console.log('\n=== 학습 완료 ===\n');
}

main().catch(console.error);
