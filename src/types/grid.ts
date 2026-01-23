/**
 * Grid Layout Types
 * 가변형 지그재그 계단형 좌석 그리드 시스템을 위한 타입 정의
 */

/**
 * 지그재그 패턴 타입
 * - even: 짝수 줄(2,4,6,8)만 오른쪽으로 0.5칸 shift
 * - odd: 홀수 줄(1,3,5,7)만 오른쪽으로 0.5칸 shift
 * - none: 지그재그 없음 (일반 그리드)
 */
export type ZigzagPattern = 'even' | 'odd' | 'none';

/**
 * 행별 오프셋 값 타입
 * - null: 기본 패턴(zigzagPattern) 따름
 * - 0, 0.25, 0.5, 0.75: 직접 지정된 오프셋 값
 */
export type RowOffsetValue = 0 | 0.25 | 0.5 | 0.75 | null;

/**
 * 그리드 레이아웃 설정
 */
export interface GridLayout {
  /** 전체 행(줄) 수 (4~8) */
  rows: number;
  /** 각 행별 최대 인원 수 배열 (길이 === rows) */
  rowCapacities: number[];
  /** 지그재그 패턴 */
  zigzagPattern: ZigzagPattern;
  /** 행별 개별 오프셋 설정 (선택적) - null은 기본 패턴 따름 */
  rowOffsets?: Record<number, RowOffsetValue>;
  /** 수동으로 설정된 그리드인지 여부 (AI 자동배치 시 참조) */
  isManuallyConfigured?: boolean;
  /** AI 추천 분배로 설정된 그리드인지 여부 (워크플로우 1단계 완료 조건) */
  isAIRecommended?: boolean;
}

/**
 * 좌석 위치 정보
 */
export interface SeatPosition {
  /** 논리적 행 번호 (0-based) */
  row: number;
  /** 논리적 열 번호 (0-based) */
  col: number;
  /** 화면상 열 위치 (지그재그 오프셋 적용, 0.5 단위 가능) */
  visualCol: number;
}

/**
 * 행별로 그룹화된 좌석 위치 정보 (Flexbox 중앙 정렬용)
 */
export interface RowSeatPositions {
  /** 행 번호 (0-based) */
  rowIndex: number;
  /** 해당 행의 모든 좌석 위치 배열 */
  seats: SeatPosition[];
  /** 행의 총 좌석 수 */
  capacity: number;
  /** Zigzag 오프셋 (0 또는 0.5) */
  offset: number;
}

/**
 * 그리드 설정 제약조건
 */
export const GRID_CONSTRAINTS = {
  MIN_ROWS: 4,
  MAX_ROWS: 8,
  DEFAULT_ROWS: 6,
  MIN_CAPACITY_PER_ROW: 0,
  MAX_CAPACITY_PER_ROW: 20,
} as const;

/**
 * 기본 그리드 레이아웃 (4x8)
 * 기존 배치표와의 호환성을 위한 fallback
 */
export const DEFAULT_GRID_LAYOUT: GridLayout = {
  rows: 4,
  rowCapacities: [8, 8, 8, 8],
  zigzagPattern: 'even',
};
