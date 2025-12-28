import { generateAISeatingArrangement, type Member } from '../src/lib/ai-seat-algorithm';

// 80명 테스트
const members: Member[] = Array(80).fill(0).map((_, i) => ({
  id: `m-${i}`,
  name: `Member${i}`,
  part: ['SOPRANO', 'ALTO', 'TENOR', 'BASS'][i % 4] as Member['part'],
}));

const result = generateAISeatingArrangement(members);

console.log('80명 배치 결과:');
console.log('Grid Layout (UI 순서):');
console.log(`  rows: ${result.grid_layout.rows}`);
console.log(`  row_capacities: [${result.grid_layout.row_capacities.join(', ')}]`);
console.log(`  합계: ${result.grid_layout.row_capacities.reduce((a, b) => a + b, 0)}`);

console.log('\n좌석 배치 검증:');
const rowCounts = Array(result.grid_layout.rows).fill(0);
result.seats.forEach(seat => {
  rowCounts[seat.row]++;
});
console.log(`  실제 배치: [${rowCounts.join(', ')}]`);
console.log(`  일치 여부: ${rowCounts.every((count, idx) => count === result.grid_layout.row_capacities[idx]) ? '✅' : '❌'}`);
