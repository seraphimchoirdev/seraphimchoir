/**
 * 좌표 변환 유틸리티
 *
 * AI 알고리즘과 UI 간의 좌표 체계 변환을 담당합니다.
 * - AI 알고리즘: 1-based 좌표 (row: 1, col: 1부터 시작)
 * - UI/프론트엔드: 0-based 좌표 (row: 0, col: 0부터 시작)
 *
 * 이 유틸리티를 사용하여 좌표 변환 로직을 중앙화하고
 * off-by-one 에러를 방지합니다.
 */

/**
 * 좌표 인터페이스
 */
export interface Coordinate {
  row: number;
  col: number;
}

/**
 * 좌석 좌표 인터페이스 (좌표 + 추가 정보)
 */
export interface SeatCoordinate extends Coordinate {
  memberId?: string;
  memberName?: string;
  part?: string;
}

/**
 * 1-based 좌표를 0-based 좌표로 변환
 *
 * AI 알고리즘에서 반환된 좌표를 UI에서 사용하기 위해 변환합니다.
 *
 * @param oneBased - 1-based 좌표 (row: 1부터 시작)
 * @returns 0-based 좌표 (row: 0부터 시작)
 *
 * @example
 * const aiResult = { row: 1, col: 1 };
 * const uiCoord = toZeroBased(aiResult);
 * // { row: 0, col: 0 }
 */
export function toZeroBased(oneBased: Coordinate): Coordinate {
  return {
    row: oneBased.row - 1,
    col: oneBased.col - 1,
  };
}

/**
 * 0-based 좌표를 1-based 좌표로 변환
 *
 * UI에서 사용하는 좌표를 AI 알고리즘이나 API로 전송하기 위해 변환합니다.
 *
 * @param zeroBased - 0-based 좌표 (row: 0부터 시작)
 * @returns 1-based 좌표 (row: 1부터 시작)
 *
 * @example
 * const uiCoord = { row: 0, col: 0 };
 * const apiCoord = toOneBased(uiCoord);
 * // { row: 1, col: 1 }
 */
export function toOneBased(zeroBased: Coordinate): Coordinate {
  return {
    row: zeroBased.row + 1,
    col: zeroBased.col + 1,
  };
}

/**
 * 좌석 배열의 좌표를 0-based로 일괄 변환
 *
 * @param seats - 1-based 좌표를 가진 좌석 배열
 * @returns 0-based 좌표로 변환된 좌석 배열
 *
 * @example
 * const aiSeats = [
 *   { row: 1, col: 1, memberId: '1' },
 *   { row: 1, col: 2, memberId: '2' },
 * ];
 * const uiSeats = seatsToZeroBased(aiSeats);
 * // [{ row: 0, col: 0, memberId: '1' }, { row: 0, col: 1, memberId: '2' }]
 */
export function seatsToZeroBased<T extends Coordinate>(seats: T[]): T[] {
  return seats.map((seat) => ({
    ...seat,
    ...toZeroBased(seat),
  }));
}

/**
 * 좌석 배열의 좌표를 1-based로 일괄 변환
 *
 * @param seats - 0-based 좌표를 가진 좌석 배열
 * @returns 1-based 좌표로 변환된 좌석 배열
 */
export function seatsToOneBased<T extends Coordinate>(seats: T[]): T[] {
  return seats.map((seat) => ({
    ...seat,
    ...toOneBased(seat),
  }));
}

/**
 * 좌표 유효성 검증 (0-based)
 *
 * @param coord - 검증할 좌표
 * @param maxRow - 최대 행 수
 * @param maxCol - 최대 열 수
 * @returns 유효한 좌표인지 여부
 */
export function isValidZeroBasedCoordinate(
  coord: Coordinate,
  maxRow: number,
  maxCol: number
): boolean {
  return (
    coord.row >= 0 &&
    coord.row < maxRow &&
    coord.col >= 0 &&
    coord.col < maxCol
  );
}

/**
 * 좌표 유효성 검증 (1-based)
 *
 * @param coord - 검증할 좌표
 * @param maxRow - 최대 행 수
 * @param maxCol - 최대 열 수
 * @returns 유효한 좌표인지 여부
 */
export function isValidOneBasedCoordinate(
  coord: Coordinate,
  maxRow: number,
  maxCol: number
): boolean {
  return (
    coord.row >= 1 &&
    coord.row <= maxRow &&
    coord.col >= 1 &&
    coord.col <= maxCol
  );
}

/**
 * 좌표 문자열 변환 (디버깅용)
 *
 * @param coord - 좌표
 * @param isOneBased - 1-based 좌표인지 여부
 * @returns 사람이 읽기 쉬운 좌표 문자열
 *
 * @example
 * coordinateToString({ row: 0, col: 0 }, false);
 * // "Row 0, Col 0 (0-based)"
 *
 * coordinateToString({ row: 1, col: 1 }, true);
 * // "Row 1, Col 1 (1-based)"
 */
export function coordinateToString(
  coord: Coordinate,
  isOneBased: boolean = false
): string {
  const base = isOneBased ? '1-based' : '0-based';
  return `Row ${coord.row}, Col ${coord.col} (${base})`;
}

/**
 * 그리드 위치를 1차원 인덱스로 변환 (0-based)
 *
 * @param coord - 0-based 좌표
 * @param cols - 열 수
 * @returns 1차원 인덱스
 */
export function coordinateToIndex(coord: Coordinate, cols: number): number {
  return coord.row * cols + coord.col;
}

/**
 * 1차원 인덱스를 그리드 좌표로 변환 (0-based)
 *
 * @param index - 1차원 인덱스
 * @param cols - 열 수
 * @returns 0-based 좌표
 */
export function indexToCoordinate(index: number, cols: number): Coordinate {
  return {
    row: Math.floor(index / cols),
    col: index % cols,
  };
}
