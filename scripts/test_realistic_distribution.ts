/**
 * AI 자동배치 알고리즘 테스트 (실제 ML 데이터 비율)
 * 소프라노 31명, 알토 21명, 테너 13명, 베이스 15명
 */

import { generateAISeatingArrangement, type Member } from '../src/lib/ai-seat-algorithm';

console.log('🧪 AI 자동배치 알고리즘 테스트 (실제 ML 데이터 비율)\n');

// ML 데이터 기준 실제 비율로 대원 생성 (80명)
const testMembers: Member[] = [];

// SOPRANO: 31명
for (let i = 0; i < 31; i++) {
  testMembers.push({
    id: 'soprano-' + i,
    name: '소프라노' + (i + 1),
    part: 'SOPRANO',
  });
}

// ALTO: 21명
for (let i = 0; i < 21; i++) {
  testMembers.push({
    id: 'alto-' + i,
    name: '알토' + (i + 1),
    part: 'ALTO',
  });
}

// TENOR: 13명
for (let i = 0; i < 13; i++) {
  testMembers.push({
    id: 'tenor-' + i,
    name: '테너' + (i + 1),
    part: 'TENOR',
  });
}

// BASS: 15명
for (let i = 0; i < 15; i++) {
  testMembers.push({
    id: 'bass-' + i,
    name: '베이스' + (i + 1),
    part: 'BASS',
  });
}

console.log('총 ' + testMembers.length + '명의 대원으로 자리배치 테스트');
console.log('  소프라노: 31명');
console.log('  알토: 21명');
console.log('  테너: 13명');
console.log('  베이스: 15명\n');
console.log('='.repeat(80));

// AI 자동배치 실행
const result = generateAISeatingArrangement(testMembers);

console.log('\n📊 배치 결과:');
console.log('  총 인원: ' + result.metadata.total_members + '명');
console.log('  행 수: ' + result.grid_layout.rows + '행');
console.log('  행별 인원: [' + result.grid_layout.row_capacities.join(', ') + ']');
console.log('  총 좌석: ' + result.seats.length + '석');

// Row 순서 검증
console.log('\n' + '='.repeat(80));
console.log('🔍 Row 순서 검증');
console.log('='.repeat(80));

const rowSeats: Record<number, number> = {};
result.seats.forEach(seat => {
  rowSeats[seat.row] = (rowSeats[seat.row] || 0) + 1;
});

console.log('\n실제 배치된 좌석 수:');
for (let row = 1; row <= result.grid_layout.rows; row++) {
  const expected = result.grid_layout.row_capacities[row - 1];
  const actual = rowSeats[row] || 0;
  const status = expected === actual ? '✅' : '❌';
  console.log('  ' + row + '행: 예상 ' + expected + '석, 실제 ' + actual + '석 ' + status);
}

// 파트별 위치 분석
console.log('\n' + '='.repeat(80));
console.log('🎵 파트별 위치 분석');
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
  const rowSeatsForRow = result.seats.filter(s => s.row === row);
  rowSeatsForRow.sort((a, b) => a.col - b.col);
  const pattern = rowSeatsForRow.map(s => s.part[0]).join(' ');
  console.log('  ' + row + '행: ' + pattern);
  console.log('       S:' + dist.SOPRANO + ', A:' + dist.ALTO + ', T:' + dist.TENOR + ', B:' + dist.BASS);
}

// 좌우 분포 분석
console.log('\n' + '='.repeat(80));
console.log('🎯 좌우 분포 분석');
console.log('='.repeat(80));

const totalLeft: Record<string, number> = { SOPRANO: 0, ALTO: 0, TENOR: 0, BASS: 0 };
const totalRight: Record<string, number> = { SOPRANO: 0, ALTO: 0, TENOR: 0, BASS: 0 };

for (let row = 1; row <= result.grid_layout.rows; row++) {
  const rowSeatsForRow = result.seats.filter(s => s.row === row);
  if (rowSeatsForRow.length === 0) continue;

  const maxCol = Math.max(...rowSeatsForRow.map(s => s.col));
  const midPoint = maxCol / 2;

  rowSeatsForRow.forEach(seat => {
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
    console.log('  ' + part + ': 왼쪽 ' + leftPct + '% (' + left + '석), 오른쪽 ' + rightPct + '% (' + right + '석)');
  }
});

console.log('\n' + '='.repeat(80));
console.log('✅ 테스트 완료');
console.log('='.repeat(80));
