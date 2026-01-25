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
 * - 음수: 왼쪽으로 이동 (1행 기준)
 * - 양수: 오른쪽으로 이동 (1행 기준)
 * 범위: -2 ~ +2 (0.25 단위)
 */
export type RowOffsetValue =
  | -2
  | -1.75
  | -1.5
  | -1.25
  | -1
  | -0.75
  | -0.5
  | -0.25
  | 0
  | 0.25
  | 0.5
  | 0.75
  | 1
  | 1.25
  | 1.5
  | 1.75
  | 2
  | null;

/**
 * 오프셋 값 배열 (순환/슬라이더용)
 * 음수: 왼쪽으로 이동, 양수: 오른쪽으로 이동
 * 범위: -2 ~ +2 (0.25 단위)
 */
export const OFFSET_VALUES: NonNullable<RowOffsetValue>[] = [
  -2, -1.75, -1.5, -1.25, -1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2,
];

/**
 * 오프셋 프리셋 인터페이스
 */
export interface OffsetPreset {
  id: string;
  name: string;
  description: string;
  /** 행 수에 따른 오프셋 계산 함수 */
  getOffsets: (rows: number) => Record<number, RowOffsetValue>;
}

/**
 * 오프셋 프리셋 목록
 * - straight: 직선 정렬 (모든 행 동일)
 * - mountain: 산 모양 (중앙 행이 가장 왼쪽, 실제 배치표 패턴)
 * - zigzag: 지그재그 (홀수/짝수 행 엇갈림)
 */
export const OFFSET_PRESETS: OffsetPreset[] = [
  {
    id: 'straight',
    name: '직선 정렬',
    description: '모든 행 동일 시작점',
    getOffsets: () => ({}),
  },
  {
    id: 'mountain',
    name: '산 모양',
    description: '3행이 가장 왼쪽 (실제 배치표 패턴)',
    getOffsets: (rows: number) => {
      // 실제 배치표 패턴 (6행 기준):
      // 1행: 0 (기준)
      // 2행: -0.25 (왼쪽으로)
      // 3행: -0.5 (가장 왼쪽, 피크)
      // 4행: -0.25 (오른쪽으로 회복)
      // 5행: 0
      // 6행: 0
      const offsets: Record<number, RowOffsetValue> = {};

      // 하드코딩된 패턴 (6행 기준)
      const pattern6 = [0, -0.25, -0.5, -0.25, 0, 0];

      for (let r = 1; r <= rows; r++) {
        // 6행 이하: 패턴 직접 적용
        // 6행 초과: 마지막 값(0) 유지
        const patternIdx = Math.min(r - 1, pattern6.length - 1);
        const offset = pattern6[patternIdx];
        if (offset !== 0) {
          offsets[r - 1] = offset as RowOffsetValue;
        }
      }
      return offsets;
    },
  },
  {
    id: 'zigzag',
    name: '지그재그',
    description: '홀수/짝수 행 엇갈림',
    getOffsets: (rows: number) => {
      const offsets: Record<number, RowOffsetValue> = {};
      for (let r = 1; r <= rows; r++) {
        if (r % 2 === 0) {
          offsets[r - 1] = 0.5;
        }
      }
      return offsets;
    },
  },
];

/**
 * 워크플로우 상태 (DB 저장용 직렬화 가능한 형태)
 * - Set을 배열로 변환하여 JSON 저장 가능
 */
export interface SerializableWorkflowState {
  /** 현재 활성화된 단계 (1~7) */
  currentStep: number;
  /** 완료된 단계 목록 (배열) */
  completedSteps: number[];
  /** 위자드 모드 (가이드 모드) 활성화 여부 */
  isWizardMode: boolean;
}

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
  /** 워크플로우 상태 (DB 저장용) */
  workflowState?: SerializableWorkflowState;
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
 *
 * zigzagPattern: 'none' - 실제 배치표 분석 결과, 지그재그 없이 왼쪽 정렬이 기본
 * 지휘자 시야 확보가 필요한 경우에만 Step 5에서 지그재그 활성화
 */
export const DEFAULT_GRID_LAYOUT: GridLayout = {
  rows: 4,
  rowCapacities: [8, 8, 8, 8],
  zigzagPattern: 'none',
};
