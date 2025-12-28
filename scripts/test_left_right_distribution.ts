/**
 * AI 자동배치 알고리즘 좌우 분포 테스트
 */

import { generateAISeatingArrangement, type Member } from '../src/lib/ai-seat-algorithm';

console.log('🧪 AI 자동배치 좌우 분포 테스트\n');

// 테스트용 대원 데이터 생성 (80명)
const testMembers: Member[] = [];

// SOPRANO: 20명
for (let i = 0; i < 20; i++) {
  testMembers.push({
    id: `soprano-${i}`,
    name: `소프라노${i + 1}`,
    part: 'SOPRANO',
  });
}

// ALTO: 20명
for (let i = 0; i < 20; i++) {
  testMembers.push({
    id: `alto-${i}`,
    name: `알토${i + 1}`,
    part: 'ALTO',
  });
}

// TENOR: 20명
for (let i = 0; i < 20; i++) {
  testMembers.push({
    id: `tenor-${i}`,
    name: `테너${i + 1}`,
    part: 'TENOR',
  });
}

// BASS: 20명
for (let i = 0; i < 20; i++) {
  testMembers.push({
    id: `bass-${i}`,
    name: `베이스${i + 1}`,
    part: 'BASS',
  });
}

console.log(`총 ${testMembers.length}명의 대원으로 자리배치 테스트\n`);
console.log('='.repeat(80));

// AI 자동배치 실행
const result = generateAISeatingArrangement(testMembers);

console.log('\n📊 배치 결과:');
console.log(`  총 인원: ${result.metadata.total_members}명`);
console.log(`  행 수: ${result.grid_layout.rows}행`);
console.log(`  행별 인원: [${result.grid_layout.row_capacities.join(', ')}]`);
console.log(`  총 좌석: ${result.seats.length}석`);

// 좌우 분포 분석
console.log('\n' + '='.repeat(80));
console.log('🎯 좌우 분포 분석');
console.log('='.repeat(80));

// 각 행별로 좌우 분포 계산
for (let row = 1; row <= result.grid_layout.rows; row++) {
  const rowSeats = result.seats.filter(s => s.row === row);
  rowSeats.sort((a, b) => a.col - b.col);

  if (rowSeats.length === 0) continue;

  // 중앙점 계산
  const maxCol = Math.max(...rowSeats.map(s => s.col));
  const midPoint = maxCol / 2;

  // 좌우로 분류
  const leftParts: Record<string, number> = { SOPRANO: 0, ALTO: 0, TENOR: 0, BASS: 0 };
  const rightParts: Record<string, number> = { SOPRANO: 0, ALTO: 0, TENOR: 0, BASS: 0 };

  rowSeats.forEach(seat => {
    if (seat.col <= midPoint) {
      leftParts[seat.part]++;
    } else {
      rightParts[seat.part]++;
    }
  });

  // 좌석 패턴 표시
  const pattern = rowSeats.map(s => s.part[0]).join(' ');

  console.log(`\n${row}행 (${rowSeats.length}석):`);
  console.log(`  패턴: ${pattern}`);
  console.log(`  왼쪽: S:${leftParts.SOPRANO}, A:${leftParts.ALTO}, T:${leftParts.TENOR}, B:${leftParts.BASS}`);
  console.log(`  오른쪽: S:${rightParts.SOPRANO}, A:${rightParts.ALTO}, T:${rightParts.TENOR}, B:${rightParts.BASS}`);
}

// 전체 좌우 분포 집계
console.log('\n' + '='.repeat(80));
console.log('📈 전체 좌우 분포 집계');
console.log('='.repeat(80));

const totalLeft: Record<string, number> = { SOPRANO: 0, ALTO: 0, TENOR: 0, BASS: 0 };
const totalRight: Record<string, number> = { SOPRANO: 0, ALTO: 0, TENOR: 0, BASS: 0 };

for (let row = 1; row <= result.grid_layout.rows; row++) {
  const rowSeats = result.seats.filter(s => s.row === row);
  if (rowSeats.length === 0) continue;

  const maxCol = Math.max(...rowSeats.map(s => s.col));
  const midPoint = maxCol / 2;

  rowSeats.forEach(seat => {
    if (seat.col <= midPoint) {
      totalLeft[seat.part]++;
    } else {
      totalRight[seat.part]++;
    }
  });
}

console.log('\n파트별 좌우 비율:');
(['SOPRANO', 'ALTO', 'TENOR', 'BASS'] as const).forEach(part => {
  const left = totalLeft[part];
  const right = totalRight[part];
  const total = left + right;

  if (total > 0) {
    const leftPct = ((left / total) * 100).toFixed(1);
    const rightPct = ((right / total) * 100).toFixed(1);
    console.log(`  ${part}: 왼쪽 ${leftPct}% (${left}석), 오른쪽 ${rightPct}% (${right}석)`);
  }
});

// 패턴 검증
console.log('\n' + '='.repeat(80));
console.log('✅ 학습 패턴 검증');
console.log('='.repeat(80));

console.log('\n예상 패턴 (ML 데이터 기반):');
console.log('  - SOPRANO: 왼쪽 85.5% (1~3행 주배치, 부족 시 4~5행 가장자리)');
console.log('  - ALTO: 오른쪽 100% (1~3행 주배치, 부족 시 4행 가장자리)');
console.log('  - TENOR: 왼쪽 86.4% (4~6행)');
console.log('  - BASS: 오른쪽 99.7% (4~6행)');

console.log('\n실제 배치:');
const sopranoLeftPct = ((totalLeft.SOPRANO / (totalLeft.SOPRANO + totalRight.SOPRANO)) * 100).toFixed(1);
const tenorLeftPct = ((totalLeft.TENOR / (totalLeft.TENOR + totalRight.TENOR)) * 100).toFixed(1);
const altoRightPct = ((totalRight.ALTO / (totalLeft.ALTO + totalRight.ALTO)) * 100).toFixed(1);
const bassRightPct = ((totalRight.BASS / (totalLeft.BASS + totalRight.BASS)) * 100).toFixed(1);

console.log(`  - SOPRANO 왼쪽: ${sopranoLeftPct}%`);
console.log(`  - TENOR 왼쪽: ${tenorLeftPct}%`);
console.log(`  - ALTO 오른쪽: ${altoRightPct}%`);
console.log(`  - BASS 오른쪽: ${bassRightPct}%`);

// 검증: 왼쪽에 SOPRANO/TENOR 주 배치, 오른쪽에 ALTO/BASS 주 배치
const isValid =
  parseFloat(sopranoLeftPct) >= 85 &&
  parseFloat(tenorLeftPct) >= 85 &&
  parseFloat(altoRightPct) >= 95 &&
  parseFloat(bassRightPct) >= 95;

console.log(`\n패턴 검증: ${isValid ? '✅ 통과 (ML 패턴 준수)' : '❌ 실패'}`);

console.log('\n' + '='.repeat(80));
console.log('✅ 테스트 완료');
console.log('='.repeat(80));
