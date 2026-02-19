import {
  toZeroBased,
  toOneBased,
  seatsToZeroBased,
  seatsToOneBased,
  isValidZeroBasedCoordinate,
  isValidOneBasedCoordinate,
  coordinateToString,
  coordinateToIndex,
  indexToCoordinate,
} from '../coordinate-converter';

describe('coordinate-converter', () => {
  describe('toZeroBased', () => {
    it('1-based 좌표를 0-based로 변환한다', () => {
      expect(toZeroBased({ row: 1, col: 1 })).toEqual({ row: 0, col: 0 });
      expect(toZeroBased({ row: 3, col: 5 })).toEqual({ row: 2, col: 4 });
    });

    it('큰 좌표도 올바르게 변환한다', () => {
      expect(toZeroBased({ row: 100, col: 200 })).toEqual({ row: 99, col: 199 });
    });
  });

  describe('toOneBased', () => {
    it('0-based 좌표를 1-based로 변환한다', () => {
      expect(toOneBased({ row: 0, col: 0 })).toEqual({ row: 1, col: 1 });
      expect(toOneBased({ row: 2, col: 4 })).toEqual({ row: 3, col: 5 });
    });
  });

  describe('왕복 변환', () => {
    it('toZeroBased → toOneBased 왕복 시 원래 값이 나온다', () => {
      const original = { row: 3, col: 7 };
      expect(toOneBased(toZeroBased(original))).toEqual(original);
    });

    it('toOneBased → toZeroBased 왕복 시 원래 값이 나온다', () => {
      const original = { row: 0, col: 0 };
      expect(toZeroBased(toOneBased(original))).toEqual(original);
    });
  });

  describe('seatsToZeroBased', () => {
    it('좌석 배열 전체를 0-based로 변환한다', () => {
      const seats = [
        { row: 1, col: 1, memberId: 'a' },
        { row: 2, col: 3, memberId: 'b' },
      ];
      const result = seatsToZeroBased(seats);
      expect(result).toEqual([
        { row: 0, col: 0, memberId: 'a' },
        { row: 1, col: 2, memberId: 'b' },
      ]);
    });

    it('빈 배열을 처리한다', () => {
      expect(seatsToZeroBased([])).toEqual([]);
    });

    it('추가 속성을 유지한다', () => {
      const seats = [{ row: 1, col: 1, memberId: 'm1', memberName: '홍길동', part: 'SOPRANO' }];
      const result = seatsToZeroBased(seats);
      expect(result[0].memberId).toBe('m1');
      expect(result[0].memberName).toBe('홍길동');
      expect(result[0].part).toBe('SOPRANO');
    });
  });

  describe('seatsToOneBased', () => {
    it('좌석 배열 전체를 1-based로 변환한다', () => {
      const seats = [
        { row: 0, col: 0 },
        { row: 1, col: 2 },
      ];
      const result = seatsToOneBased(seats);
      expect(result).toEqual([
        { row: 1, col: 1 },
        { row: 2, col: 3 },
      ]);
    });
  });

  describe('isValidZeroBasedCoordinate', () => {
    it('유효한 0-based 좌표를 통과시킨다', () => {
      expect(isValidZeroBasedCoordinate({ row: 0, col: 0 }, 6, 15)).toBe(true);
      expect(isValidZeroBasedCoordinate({ row: 5, col: 14 }, 6, 15)).toBe(true);
    });

    it('경계 밖 좌표를 거부한다', () => {
      expect(isValidZeroBasedCoordinate({ row: -1, col: 0 }, 6, 15)).toBe(false);
      expect(isValidZeroBasedCoordinate({ row: 6, col: 0 }, 6, 15)).toBe(false);
      expect(isValidZeroBasedCoordinate({ row: 0, col: 15 }, 6, 15)).toBe(false);
      expect(isValidZeroBasedCoordinate({ row: 0, col: -1 }, 6, 15)).toBe(false);
    });
  });

  describe('isValidOneBasedCoordinate', () => {
    it('유효한 1-based 좌표를 통과시킨다', () => {
      expect(isValidOneBasedCoordinate({ row: 1, col: 1 }, 6, 15)).toBe(true);
      expect(isValidOneBasedCoordinate({ row: 6, col: 15 }, 6, 15)).toBe(true);
    });

    it('경계 밖 좌표를 거부한다', () => {
      expect(isValidOneBasedCoordinate({ row: 0, col: 1 }, 6, 15)).toBe(false);
      expect(isValidOneBasedCoordinate({ row: 7, col: 1 }, 6, 15)).toBe(false);
      expect(isValidOneBasedCoordinate({ row: 1, col: 0 }, 6, 15)).toBe(false);
      expect(isValidOneBasedCoordinate({ row: 1, col: 16 }, 6, 15)).toBe(false);
    });
  });

  describe('coordinateToString', () => {
    it('0-based 좌표를 문자열로 변환한다', () => {
      expect(coordinateToString({ row: 0, col: 0 })).toBe('Row 0, Col 0 (0-based)');
    });

    it('1-based 좌표를 문자열로 변환한다', () => {
      expect(coordinateToString({ row: 1, col: 1 }, true)).toBe('Row 1, Col 1 (1-based)');
    });
  });

  describe('coordinateToIndex / indexToCoordinate', () => {
    it('좌표를 1차원 인덱스로 변환한다', () => {
      expect(coordinateToIndex({ row: 0, col: 0 }, 15)).toBe(0);
      expect(coordinateToIndex({ row: 1, col: 3 }, 15)).toBe(18);
      expect(coordinateToIndex({ row: 2, col: 0 }, 15)).toBe(30);
    });

    it('1차원 인덱스를 좌표로 변환한다', () => {
      expect(indexToCoordinate(0, 15)).toEqual({ row: 0, col: 0 });
      expect(indexToCoordinate(18, 15)).toEqual({ row: 1, col: 3 });
      expect(indexToCoordinate(30, 15)).toEqual({ row: 2, col: 0 });
    });

    it('왕복 변환이 일치한다', () => {
      const cols = 15;
      for (let i = 0; i < 90; i++) {
        const coord = indexToCoordinate(i, cols);
        expect(coordinateToIndex(coord, cols)).toBe(i);
      }
    });
  });
});
