/**
 * 행별 인원 분배 추천 시스템 테스트
 */

import { recommendRowDistribution } from '../src/lib/row-distribution-recommender';

console.log('🧪 행별 인원 분배 추천 시스템 테스트\n');
console.log('='.repeat(80));

// 테스트 케이스 (UI 순서: 앞줄이 많고 뒷줄이 적음)
const testCases = [
  { total: 45, expected: '5행, 앞쪽 많고 뒤쪽 적음' },
  { total: 55, expected: '5행, 앞쪽 많고 뒤쪽 적음' },
  { total: 60, expected: '6행, 앞쪽 많고 뒤쪽 적음' },
  { total: 75, expected: '6행, 앞쪽 많고 뒤쪽 적음' },
  { total: 80, expected: '6행, 앞쪽 많고 뒤쪽 적음' },
  { total: 84, expected: '6행, 학습 데이터 존재' },
  { total: 88, expected: '6행, 학습 데이터 존재' },
  { total: 93, expected: '6행, 보간법 적용' },
];

testCases.forEach((testCase) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`총 인원: ${testCase.total}명 (${testCase.expected})`);
  console.log('='.repeat(80));

  const recommendation = recommendRowDistribution(testCase.total);

  console.log(`\n결과:`);
  console.log(`  행 수: ${recommendation.rows}행`);
  console.log(`  행별 인원: [${recommendation.rowCapacities.join(', ')}]`);
  console.log(`  총 좌석: ${recommendation.rowCapacities.reduce((a, b) => a + b, 0)}석`);
  console.log(`  신뢰도: ${recommendation.confidence}`);
  console.log(`  소스: ${recommendation.source}`);

  if (recommendation.similarPattern) {
    console.log(
      `  유사 패턴: ${recommendation.similarPattern.totalMembers}명 (${recommendation.similarPattern.observations}회 관찰)`
    );
  }

  // 검증
  const totalSeats = recommendation.rowCapacities.reduce((a, b) => a + b, 0);
  const isCorrect = totalSeats === testCase.total;

  console.log(`\n검증: ${isCorrect ? '✅ 통과' : '❌ 실패'} (총 좌석 ${totalSeats}석)`);

  // 패턴 분석 (UI 순서: index 0 = 1줄(앞), index n-1 = n줄(뒤))
  const front = recommendation.rowCapacities.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
  const back =
    recommendation.rowCapacities
      .slice(-2)
      .reduce((a, b) => a + b, 0) / 2;

  console.log(`  앞쪽 행(1-2줄) 평균: ${front.toFixed(1)}명`);
  console.log(`  뒤쪽 행(마지막 2줄) 평균: ${back.toFixed(1)}명`);
  console.log(`  패턴 확인: ${front > back ? '✅ 앞쪽이 많음' : '❌ 패턴 불일치'}`);
});

console.log(`\n${'='.repeat(80)}`);
console.log('✅ 모든 테스트 완료');
console.log('='.repeat(80));

// 기존 균등 분배와 비교
console.log(`\n\n${'='.repeat(80)}`);
console.log('📊 AI 추천 vs 균등 분배 비교');
console.log('='.repeat(80));

const compareTotal = 80;
const recommended = recommendRowDistribution(compareTotal);

// 균등 분배 (6행)
const evenRows = 6;
const evenBase = Math.floor(compareTotal / evenRows);
const evenRemainder = compareTotal % evenRows;
const evenDistribution = Array(evenRows)
  .fill(evenBase)
  .map((v, i) => (i < evenRemainder ? v + 1 : v));

console.log(`\n총 인원: ${compareTotal}명`);
console.log(`\nAI 추천 (학습 데이터 기반):`);
console.log(`  [${recommended.rowCapacities.join(', ')}]`);
console.log(`  소스: ${recommended.source}, 신뢰도: ${recommended.confidence}`);

console.log(`\n균등 분배 (기존 방식):`);
console.log(`  [${evenDistribution.join(', ')}]`);

console.log(`\n차이점:`);
recommended.rowCapacities.forEach((aiValue, idx) => {
  const diff = aiValue - evenDistribution[idx];
  const sign = diff > 0 ? '+' : '';
  console.log(`  ${idx}행: AI ${aiValue}명 vs 균등 ${evenDistribution[idx]}명 (${sign}${diff})`);
});
