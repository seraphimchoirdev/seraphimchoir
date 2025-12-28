/**
 * AI 자동배치 알고리즘 row 순서 변환 테스트
 */

import { generateAISeatingArrangement, type Member } from '../src/lib/ai-seat-algorithm';

console.log('🧪 AI 자동배치 알고리즘 테스트\n');

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
console.log(`  지그재그 패턴: ${result.grid_layout.zigzag_pattern}`);

console.log('\n파트별 분포:');
Object.entries(result.metadata.breakdown).forEach(([part, count]) => {
  console.log(`  ${part}: ${count}명`);
});

// Row 순서 검증
console.log('\n' + '='.repeat(80));
console.log('🔍 Row 순서 검증 (UI 기준)');
console.log('='.repeat(80));

// 각 행별로 배치된 좌석 수 계산
const rowSeats: Record<number, number> = {};
result.seats.forEach(seat => {
  rowSeats[seat.row] = (rowSeats[seat.row] || 0) + 1;
});

console.log('\n실제 배치된 좌석 수 (UI row 순서, 1-based):');
for (let row = 1; row <= result.grid_layout.rows; row++) {
  const expected = result.grid_layout.row_capacities[row - 1];
  const actual = rowSeats[row] || 0;
  const status = expected === actual ? '✅' : '❌';
  console.log(`  ${row}행 (${row}줄): 예상 ${expected}석, 실제 ${actual}석 ${status}`);
}

// 파트별 위치 분석
console.log('\n' + '='.repeat(80));
console.log('🎵 파트별 위치 분석 (UI row 순서)');
console.log('='.repeat(80));

const partByRow: Record<number, Record<string, number>> = {};
result.seats.forEach(seat => {
  if (!partByRow[seat.row]) {
    partByRow[seat.row] = { SOPRANO: 0, ALTO: 0, TENOR: 0, BASS: 0 };
  }
  partByRow[seat.row][seat.part]++;
});

console.log('\n행별 파트 분포:');
for (let row = 1; row <= result.grid_layout.rows; row++) {
  const dist = partByRow[row] || { SOPRANO: 0, ALTO: 0, TENOR: 0, BASS: 0 };
  console.log(`  ${row}행 (${row}줄): S:${dist.SOPRANO}, A:${dist.ALTO}, T:${dist.TENOR}, B:${dist.BASS}`);
}

// 학습 패턴 검증
console.log('\n' + '='.repeat(80));
console.log('📚 학습 패턴 검증');
console.log('='.repeat(80));

console.log('\n예상 패턴 (ML 데이터 기반, 1-based):');
console.log('  - SOPRANO/ALTO: row 1-3 (앞쪽 = 청중 가까운 위치)');
console.log('  - TENOR/BASS: row 4-6 (뒤쪽 = 무대 가까운 위치)');

const frontRows = [1, 2, 3];  // UI 1-3줄
const backRows = [4, 5, 6];   // UI 4-6줄

let frontSA = 0, frontTB = 0;
let backSA = 0, backTB = 0;

result.seats.forEach(seat => {
  if (frontRows.includes(seat.row)) {
    if (seat.part === 'SOPRANO' || seat.part === 'ALTO') frontSA++;
    if (seat.part === 'TENOR' || seat.part === 'BASS') frontTB++;
  }
  if (backRows.includes(seat.row)) {
    if (seat.part === 'SOPRANO' || seat.part === 'ALTO') backSA++;
    if (seat.part === 'TENOR' || seat.part === 'BASS') backTB++;
  }
});

console.log('\n실제 배치 결과:');
console.log(`  앞쪽 행(1-3줄): SOPRANO/ALTO ${frontSA}명, TENOR/BASS ${frontTB}명`);
console.log(`  뒤쪽 행(4-6줄): SOPRANO/ALTO ${backSA}명, TENOR/BASS ${backTB}명`);

const isCorrect = frontSA > frontTB && backTB > backSA;
console.log(`\n패턴 검증: ${isCorrect ? '✅ 통과 (앞쪽에 SOPRANO/ALTO 많음, 뒤쪽에 TENOR/BASS 많음)' : '❌ 실패'}`);

console.log('\n' + '='.repeat(80));
console.log('✅ 테스트 완료');
console.log('='.repeat(80));
