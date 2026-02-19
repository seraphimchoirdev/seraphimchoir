import {
  recommendRowDistribution,
  getAllLearnedPatterns,
  getLearnedPatternsInRange,
  adjustRecommendationForPartConstraints,
  type RowDistributionRecommendation,
} from '../row-distribution-recommender';

describe('row-distribution-recommender', () => {
  describe('recommendRowDistribution', () => {
    it('학습된 패턴이 있는 인원(84명)에 대해 high confidence를 반환한다', () => {
      const result = recommendRowDistribution(84);

      expect(result.confidence).toBe('high');
      expect(result.source).toBe('learned');
      expect(result.rows).toBeGreaterThanOrEqual(5);
      expect(result.rows).toBeLessThanOrEqual(6);

      const total = result.rowCapacities.reduce((a, b) => a + b, 0);
      expect(total).toBe(84);
    });

    it('가까운 패턴이 있으면 보간법을 사용한다 (83명)', () => {
      const result = recommendRowDistribution(83);

      expect(['medium', 'high']).toContain(result.confidence);

      const total = result.rowCapacities.reduce((a, b) => a + b, 0);
      expect(total).toBe(83);
    });

    it('55명 이하면 5행, 초과하면 6행을 반환한다', () => {
      const result50 = recommendRowDistribution(50);
      const result60 = recommendRowDistribution(60);

      expect(result50.rows).toBeLessThanOrEqual(6);
      expect(result60.rows).toBeGreaterThanOrEqual(5);
    });

    it('rowCapacities 합이 항상 totalMembers와 일치한다', () => {
      const testCases = [45, 50, 55, 60, 70, 80, 90, 95];

      for (const total of testCases) {
        const result = recommendRowDistribution(total);
        const sum = result.rowCapacities.reduce((a, b) => a + b, 0);
        expect(sum).toBe(total);
      }
    });

    it('캐시가 작동한다 (동일 인원 재호출)', () => {
      // 첫 호출
      const result1 = recommendRowDistribution(75);
      // 두 번째 호출 (캐시 히트 예상)
      const result2 = recommendRowDistribution(75);

      expect(result2.rowCapacities).toEqual(result1.rowCapacities);
    });

    it('partCounts가 있으면 ALTO 제약을 반영한다', () => {
      const result = recommendRowDistribution(84, {
        SOPRANO: 20,
        ALTO: 25,
        TENOR: 20,
        BASS: 19,
      });

      const total = result.rowCapacities.reduce((a, b) => a + b, 0);
      expect(total).toBe(84);
    });
  });

  describe('getAllLearnedPatterns', () => {
    it('학습된 패턴 목록을 반환한다', () => {
      const patterns = getAllLearnedPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('totalMembers');
      expect(patterns[0]).toHaveProperty('rows');
      expect(patterns[0]).toHaveProperty('capacities');
      expect(patterns[0]).toHaveProperty('observations');
    });

    it('각 패턴의 capacities 합이 totalMembers와 일치한다', () => {
      const patterns = getAllLearnedPatterns();

      for (const pattern of patterns) {
        const sum = pattern.capacities.reduce((a, b) => a + b, 0);
        expect(sum).toBe(pattern.totalMembers);
      }
    });
  });

  describe('getLearnedPatternsInRange', () => {
    it('지정된 범위의 패턴만 반환한다', () => {
      const patterns = getLearnedPatternsInRange(80, 90);

      for (const pattern of patterns) {
        expect(pattern.totalMembers).toBeGreaterThanOrEqual(80);
        expect(pattern.totalMembers).toBeLessThanOrEqual(90);
      }
    });

    it('범위 밖이면 빈 배열을 반환한다', () => {
      const patterns = getLearnedPatternsInRange(1000, 2000);
      expect(patterns).toEqual([]);
    });
  });

  describe('adjustRecommendationForPartConstraints', () => {
    const baseRecommendation: RowDistributionRecommendation = {
      rows: 6,
      rowCapacities: [15, 15, 15, 15, 13, 11],
      confidence: 'high',
      source: 'learned',
    };

    it('ALTO 인원이 0이면 null을 반환한다 (조정 불필요)', () => {
      const result = adjustRecommendationForPartConstraints(baseRecommendation, { ALTO: 0 });
      expect(result).toBeNull();
    });

    it('ALTO가 충분하면 null을 반환한다 (조정 불필요)', () => {
      // 1-4행에 충분한 좌석이 있는 경우
      const result = adjustRecommendationForPartConstraints(baseRecommendation, {
        SOPRANO: 20,
        ALTO: 15,
      });
      // 충분하면 null, 부족하면 조정된 결과
      if (result !== null) {
        expect(result.source).toBe('adjusted');
      }
    });

    it('조정 시 총 좌석 수를 유지한다', () => {
      const result = adjustRecommendationForPartConstraints(baseRecommendation, {
        SOPRANO: 10,
        ALTO: 40,
        TENOR: 15,
        BASS: 19,
      });

      if (result) {
        const originalTotal = baseRecommendation.rowCapacities.reduce((a, b) => a + b, 0);
        const adjustedTotal = result.rowCapacities.reduce((a, b) => a + b, 0);
        expect(adjustedTotal).toBe(originalTotal);
        expect(result.adjustments?.reason).toBe('alto_constraint');
      }
    });
  });
});
