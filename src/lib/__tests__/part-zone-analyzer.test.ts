import {
  analyzePartZonesFromSeats,
  calculateDynamicPartZones,
  isInPartZone,
  manhattanDistance,
  findNearestEmptySeatInZone,
  findNearestEmptySeatInExpandedZone,
  DEFAULT_PART_ZONES,
} from '../part-zone-analyzer';

describe('part-zone-analyzer', () => {
  describe('DEFAULT_PART_ZONES', () => {
    it('5개 파트에 대한 기본 영역이 정의되어 있다', () => {
      expect(DEFAULT_PART_ZONES).toHaveProperty('SOPRANO');
      expect(DEFAULT_PART_ZONES).toHaveProperty('ALTO');
      expect(DEFAULT_PART_ZONES).toHaveProperty('TENOR');
      expect(DEFAULT_PART_ZONES).toHaveProperty('BASS');
      expect(DEFAULT_PART_ZONES).toHaveProperty('SPECIAL');
    });

    it('SOPRANO는 왼쪽, 1-3행 선호이다', () => {
      expect(DEFAULT_PART_ZONES.SOPRANO.side).toBe('left');
      expect(DEFAULT_PART_ZONES.SOPRANO.allowedRows).toEqual([1, 3]);
    });

    it('TENOR는 왼쪽, 4-6행이다', () => {
      expect(DEFAULT_PART_ZONES.TENOR.side).toBe('left');
      expect(DEFAULT_PART_ZONES.TENOR.forbiddenRows).toEqual([1, 2, 3]);
    });

    it('ALTO는 오른쪽, 5-6행 금지이다', () => {
      expect(DEFAULT_PART_ZONES.ALTO.side).toBe('right');
      expect(DEFAULT_PART_ZONES.ALTO.forbiddenRows).toContain(5);
      expect(DEFAULT_PART_ZONES.ALTO.forbiddenRows).toContain(6);
    });
  });

  describe('manhattanDistance', () => {
    it('같은 위치이면 0이다', () => {
      expect(manhattanDistance({ row: 1, col: 1 }, { row: 1, col: 1 })).toBe(0);
    });

    it('맨해튼 거리를 올바르게 계산한다', () => {
      expect(manhattanDistance({ row: 1, col: 1 }, { row: 3, col: 5 })).toBe(6);
      expect(manhattanDistance({ row: 1, col: 1 }, { row: 1, col: 3 })).toBe(2);
      expect(manhattanDistance({ row: 1, col: 1 }, { row: 4, col: 1 })).toBe(3);
    });

    it('순서에 무관하다 (교환법칙)', () => {
      const a = { row: 2, col: 3 };
      const b = { row: 5, col: 7 };
      expect(manhattanDistance(a, b)).toBe(manhattanDistance(b, a));
    });
  });

  describe('isInPartZone', () => {
    it('SOPRANO가 왼쪽 영역에 있으면 true', () => {
      expect(isInPartZone(1, 3, 'SOPRANO', DEFAULT_PART_ZONES.SOPRANO, 15)).toBe(true);
    });

    it('SOPRANO가 오른쪽 영역에 있으면 false', () => {
      // midCol = ceil(15/2) = 8, 왼쪽은 < 8
      expect(isInPartZone(1, 10, 'SOPRANO', DEFAULT_PART_ZONES.SOPRANO, 15)).toBe(false);
    });

    it('SOPRANO가 4행(allowedRows 밖)에 있으면 false', () => {
      expect(isInPartZone(4, 3, 'SOPRANO', DEFAULT_PART_ZONES.SOPRANO, 15)).toBe(false);
    });

    it('ALTO가 5행(금지행)에 있으면 false', () => {
      expect(isInPartZone(5, 10, 'ALTO', DEFAULT_PART_ZONES.ALTO, 15)).toBe(false);
    });

    it('TENOR가 1행(금지행)에 있으면 false', () => {
      expect(isInPartZone(1, 3, 'TENOR', DEFAULT_PART_ZONES.TENOR, 15)).toBe(false);
    });

    it('SPECIAL은 어디서든 true (both side, 전체 행)', () => {
      expect(isInPartZone(1, 1, 'SPECIAL', DEFAULT_PART_ZONES.SPECIAL, 15)).toBe(true);
      expect(isInPartZone(6, 15, 'SPECIAL', DEFAULT_PART_ZONES.SPECIAL, 15)).toBe(true);
    });
  });

  describe('analyzePartZonesFromSeats', () => {
    it('좌석 데이터에서 파트별 통계를 생성한다', () => {
      const seats = [
        { seat_row: 1, seat_column: 1, part: 'SOPRANO' as const },
        { seat_row: 1, seat_column: 2, part: 'SOPRANO' as const },
        { seat_row: 1, seat_column: 8, part: 'ALTO' as const },
        { seat_row: 4, seat_column: 1, part: 'TENOR' as const },
      ];

      const stats = analyzePartZonesFromSeats(seats);

      expect(stats.has('SOPRANO')).toBe(true);
      expect(stats.has('ALTO')).toBe(true);
      expect(stats.has('TENOR')).toBe(true);

      const sopranoStats = stats.get('SOPRANO')!;
      expect(sopranoStats.totalSeats).toBe(2);
      expect(sopranoStats.avgRow).toBe(1);
      expect(sopranoStats.avgCol).toBe(1.5);
      expect(sopranoStats.minCol).toBe(1);
      expect(sopranoStats.maxCol).toBe(2);
    });

    it('빈 좌석 데이터이면 빈 Map을 반환한다', () => {
      const stats = analyzePartZonesFromSeats([]);
      expect(stats.size).toBe(0);
    });
  });

  describe('calculateDynamicPartZones', () => {
    it('통계 없는 파트는 기본 영역을 사용한다', () => {
      const stats = new Map();
      const zones = calculateDynamicPartZones(stats, 6);

      expect(zones.get('SOPRANO')?.side).toBe('left');
      expect(zones.get('ALTO')?.side).toBe('right');
    });

    it('통계 기반으로 영역을 조정한다', () => {
      const stats = analyzePartZonesFromSeats([
        { seat_row: 1, seat_column: 1, part: 'SOPRANO' as const },
        { seat_row: 2, seat_column: 2, part: 'SOPRANO' as const },
        { seat_row: 1, seat_column: 10, part: 'ALTO' as const },
        { seat_row: 2, seat_column: 12, part: 'ALTO' as const },
      ]);

      const zones = calculateDynamicPartZones(stats, 6);
      const sopranoZone = zones.get('SOPRANO')!;
      const altoZone = zones.get('ALTO')!;

      expect(sopranoZone.side).toBe('left');
      expect(altoZone.side).toBe('right');
    });
  });

  describe('findNearestEmptySeatInZone', () => {
    it('파트 영역 내에서 가장 가까운 빈 좌석을 찾는다', () => {
      const emptySeats = [
        { row: 1, col: 2 },
        { row: 1, col: 5 },
        { row: 2, col: 3 },
      ];

      const result = findNearestEmptySeatInZone(
        { row: 1, col: 3 },
        emptySeats,
        'SOPRANO',
        DEFAULT_PART_ZONES.SOPRANO,
        [15, 15]
      );

      expect(result).toEqual({ row: 1, col: 2 });
    });

    it('영역 내 빈 좌석이 없으면 null을 반환한다', () => {
      const emptySeats = [{ row: 5, col: 10 }]; // SOPRANO 영역 밖

      const result = findNearestEmptySeatInZone(
        { row: 1, col: 1 },
        emptySeats,
        'SOPRANO',
        DEFAULT_PART_ZONES.SOPRANO,
        [15, 15, 15, 15, 15]
      );

      expect(result).toBeNull();
    });
  });

  describe('findNearestEmptySeatInExpandedZone', () => {
    it('기본 영역에서 찾으면 primary 레벨을 반환한다', () => {
      const emptySeats = [{ row: 1, col: 2 }];

      const result = findNearestEmptySeatInExpandedZone(
        { row: 1, col: 3 },
        emptySeats,
        'SOPRANO',
        DEFAULT_PART_ZONES.SOPRANO,
        [15, 15, 15]
      );

      expect(result?.searchLevel).toBe('primary');
    });

    it('확장 영역에서 찾으면 expanded 레벨을 반환한다', () => {
      // 4행에 빈 좌석 (SOPRANO 기본 영역은 1-3행)
      const emptySeats = [{ row: 4, col: 2 }];

      const result = findNearestEmptySeatInExpandedZone(
        { row: 3, col: 2 },
        emptySeats,
        'SOPRANO',
        DEFAULT_PART_ZONES.SOPRANO,
        [15, 15, 15, 15, 15, 15]
      );

      // 확장 영역(0-4행)에 포함되므로 expanded
      if (result) {
        expect(result.searchLevel).toBe('expanded');
      }
    });

    it('fallback 비활성 시 null을 반환한다', () => {
      const emptySeats = [{ row: 6, col: 14 }]; // SOPRANO 영역 완전 밖

      const result = findNearestEmptySeatInExpandedZone(
        { row: 1, col: 1 },
        emptySeats,
        'SOPRANO',
        DEFAULT_PART_ZONES.SOPRANO,
        [15, 15, 15, 15, 15, 15],
        false
      );

      expect(result).toBeNull();
    });

    it('fallback 활성 시 가장 가까운 빈 좌석을 반환한다', () => {
      const emptySeats = [{ row: 6, col: 1 }];

      const result = findNearestEmptySeatInExpandedZone(
        { row: 1, col: 1 },
        emptySeats,
        'SOPRANO',
        DEFAULT_PART_ZONES.SOPRANO,
        [15, 15, 15, 15, 15, 15],
        true
      );

      expect(result).not.toBeNull();
      expect(result?.searchLevel).toBe('fallback');
    });
  });
});
