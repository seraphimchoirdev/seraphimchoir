import {
  calculateQualityMetrics,
  calculatePlacementRate,
  calculatePartBalance,
  calculateHeightOrder,
  calculateLeaderPosition,
  calculateOverallQualityScore,
  type SeatWithMember,
  type QualityMetrics,
} from '../quality-metrics';

// 테스트용 좌석 데이터 생성 헬퍼
function createSeat(overrides: Partial<SeatWithMember> & { memberId: string }): SeatWithMember {
  return {
    memberName: `멤버_${overrides.memberId}`,
    part: 'SOPRANO',
    row: 1,
    col: 1,
    ...overrides,
  };
}

describe('quality-metrics', () => {
  describe('calculatePlacementRate', () => {
    it('전원 배치 시 1을 반환한다', () => {
      const seats = [createSeat({ memberId: '1' }), createSeat({ memberId: '2' })];
      expect(calculatePlacementRate(seats, 2)).toBe(1);
    });

    it('절반 배치 시 0.5를 반환한다', () => {
      const seats = [createSeat({ memberId: '1' })];
      expect(calculatePlacementRate(seats, 2)).toBe(0.5);
    });

    it('미배치 시 0을 반환한다', () => {
      expect(calculatePlacementRate([], 5)).toBe(0);
    });

    it('총인원 0이면 0을 반환한다', () => {
      expect(calculatePlacementRate([], 0)).toBe(0);
    });
  });

  describe('calculatePartBalance', () => {
    it('단일 파트만 있으면 1을 반환한다', () => {
      const seats = [
        createSeat({ memberId: '1', part: 'SOPRANO' }),
        createSeat({ memberId: '2', part: 'SOPRANO' }),
      ];
      expect(calculatePartBalance(seats)).toBe(1);
    });

    it('파트별 인원이 동일하면 1을 반환한다', () => {
      const seats = [
        createSeat({ memberId: '1', part: 'SOPRANO' }),
        createSeat({ memberId: '2', part: 'ALTO' }),
        createSeat({ memberId: '3', part: 'TENOR' }),
        createSeat({ memberId: '4', part: 'BASS' }),
      ];
      expect(calculatePartBalance(seats)).toBe(1);
    });

    it('파트별 인원이 불균형하면 1보다 작은 값을 반환한다', () => {
      const seats = [
        createSeat({ memberId: '1', part: 'SOPRANO' }),
        createSeat({ memberId: '2', part: 'SOPRANO' }),
        createSeat({ memberId: '3', part: 'SOPRANO' }),
        createSeat({ memberId: '4', part: 'ALTO' }),
      ];
      const balance = calculatePartBalance(seats);
      expect(balance).toBeGreaterThan(0);
      expect(balance).toBeLessThan(1);
    });

    it('빈 좌석이면 0을 반환한다', () => {
      expect(calculatePartBalance([])).toBe(0);
    });
  });

  describe('calculateHeightOrder', () => {
    it('키 정보가 없으면 1을 반환한다', () => {
      const seats = [
        createSeat({ memberId: '1', row: 1, col: 1 }),
        createSeat({ memberId: '2', row: 1, col: 2 }),
      ];
      expect(calculateHeightOrder(seats)).toBe(1);
    });

    it('1명만 있으면 1을 반환한다', () => {
      const seats = [createSeat({ memberId: '1', height: 170 })];
      expect(calculateHeightOrder(seats)).toBe(1);
    });

    it('완벽한 오름차순 키 정렬이면 높은 점수를 반환한다', () => {
      const seats = [
        createSeat({ memberId: '1', row: 1, col: 1, height: 155 }),
        createSeat({ memberId: '2', row: 1, col: 2, height: 160 }),
        createSeat({ memberId: '3', row: 1, col: 3, height: 165 }),
        createSeat({ memberId: '4', row: 1, col: 4, height: 170 }),
      ];
      expect(calculateHeightOrder(seats)).toBe(1);
    });

    it('완벽한 내림차순 키 정렬이면 높은 점수를 반환한다', () => {
      const seats = [
        createSeat({ memberId: '1', row: 1, col: 1, height: 170 }),
        createSeat({ memberId: '2', row: 1, col: 2, height: 165 }),
        createSeat({ memberId: '3', row: 1, col: 3, height: 160 }),
        createSeat({ memberId: '4', row: 1, col: 4, height: 155 }),
      ];
      expect(calculateHeightOrder(seats)).toBe(1);
    });

    it('랜덤 키 정렬이면 낮은 점수를 반환한다', () => {
      const seats = [
        createSeat({ memberId: '1', row: 1, col: 1, height: 170 }),
        createSeat({ memberId: '2', row: 1, col: 2, height: 155 }),
        createSeat({ memberId: '3', row: 1, col: 3, height: 180 }),
        createSeat({ memberId: '4', row: 1, col: 4, height: 160 }),
      ];
      const score = calculateHeightOrder(seats);
      expect(score).toBeLessThan(1);
    });

    it('여러 행에 대해 평균 점수를 반환한다', () => {
      const seats = [
        // 1행: 완벽한 오름차순
        createSeat({ memberId: '1', row: 1, col: 1, height: 155 }),
        createSeat({ memberId: '2', row: 1, col: 2, height: 160 }),
        // 2행: 역순
        createSeat({ memberId: '3', row: 2, col: 1, height: 170 }),
        createSeat({ memberId: '4', row: 2, col: 2, height: 160 }),
      ];
      const score = calculateHeightOrder(seats);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateLeaderPosition', () => {
    it('파트장이 없으면 1을 반환한다', () => {
      const seats = [createSeat({ memberId: '1' })];
      expect(calculateLeaderPosition(seats)).toBe(1);
    });

    it('파트장이 파트 중앙에 있으면 높은 점수를 반환한다', () => {
      const seats = [
        createSeat({ memberId: '1', row: 1, col: 1, part: 'SOPRANO' }),
        createSeat({ memberId: '2', row: 1, col: 2, part: 'SOPRANO', isLeader: true }),
        createSeat({ memberId: '3', row: 1, col: 3, part: 'SOPRANO' }),
      ];
      expect(calculateLeaderPosition(seats)).toBe(1);
    });

    it('파트장이 파트 끝에 있으면 낮은 점수를 반환한다', () => {
      const seats = [
        createSeat({ memberId: '1', row: 1, col: 1, part: 'SOPRANO', isLeader: true }),
        createSeat({ memberId: '2', row: 1, col: 2, part: 'SOPRANO' }),
        createSeat({ memberId: '3', row: 1, col: 3, part: 'SOPRANO' }),
      ];
      const score = calculateLeaderPosition(seats);
      expect(score).toBeLessThan(1);
    });
  });

  describe('calculateOverallQualityScore', () => {
    it('가중 평균을 올바르게 계산한다 (50%+30%+20%)', () => {
      const metrics: QualityMetrics = {
        placementRate: 1,
        partBalance: 1,
        heightOrder: 1,
      };
      expect(calculateOverallQualityScore(metrics)).toBe(1);
    });

    it('모든 메트릭이 0이면 0을 반환한다', () => {
      const metrics: QualityMetrics = {
        placementRate: 0,
        partBalance: 0,
        heightOrder: 0,
      };
      expect(calculateOverallQualityScore(metrics)).toBe(0);
    });

    it('가중치가 올바르게 적용된다', () => {
      const metrics: QualityMetrics = {
        placementRate: 1,
        partBalance: 0,
        heightOrder: 0,
      };
      expect(calculateOverallQualityScore(metrics)).toBeCloseTo(0.5);
    });
  });

  describe('calculateQualityMetrics (통합)', () => {
    it('전체 메트릭을 한번에 계산한다', () => {
      const seats = [
        createSeat({ memberId: '1', part: 'SOPRANO', row: 1, col: 1, height: 160 }),
        createSeat({ memberId: '2', part: 'ALTO', row: 1, col: 2, height: 165 }),
      ];
      const metrics = calculateQualityMetrics(seats, 2);

      expect(metrics).toHaveProperty('placementRate');
      expect(metrics).toHaveProperty('partBalance');
      expect(metrics).toHaveProperty('heightOrder');
      expect(metrics.placementRate).toBe(1);
    });
  });
});
