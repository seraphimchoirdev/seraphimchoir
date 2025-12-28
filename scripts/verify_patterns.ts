/**
 * 학습된 패턴 데이터 검증 및 수정
 */

import rowDistributionPatterns from '../training_data/row_distribution_patterns.json';

console.log('🔍 학습된 패턴 데이터 검증\n');

const patterns = rowDistributionPatterns as Record<string, { rows: number; capacities: number[]; observations: number }>;

let hasErrors = false;

Object.entries(patterns).forEach(([total, pattern]) => {
  const sum = pattern.capacities.reduce((a, b) => a + b, 0);
  const expectedTotal = parseInt(total);

  if (sum !== expectedTotal) {
    console.log(`❌ ${total}명: ${JSON.stringify(pattern.capacities)} = ${sum}석 (차이: ${sum - expectedTotal})`);
    hasErrors = true;
  } else {
    console.log(`✅ ${total}명: ${JSON.stringify(pattern.capacities)} = ${sum}석`);
  }
});

if (hasErrors) {
  console.log('\n⚠️ 일부 패턴의 합계가 일치하지 않습니다!');
  console.log('원본 학습 데이터에 오류가 있을 수 있습니다.');
} else {
  console.log('\n✅ 모든 패턴이 올바릅니다!');
}
