/**
 * 애플리케이션 전역 상수
 *
 * 매직 넘버를 명확한 이름의 상수로 정의하여
 * 코드 가독성과 유지보수성을 향상시킵니다.
 */

// ========================================
// 시간 단위 상수 (밀리초)
// ========================================
export const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 1000 * 60,
  HOUR: 1000 * 60 * 60,
  DAY: 1000 * 60 * 60 * 24,
} as const;

// ========================================
// React Query 캐시 설정
// ========================================
export const STALE_TIME = {
  /** 짧은 캐시 (30초) - 자주 변경되는 데이터 */
  SHORT: TIME_UNITS.SECOND * 30,
  /** 기본 캐시 (1분) */
  DEFAULT: TIME_UNITS.MINUTE,
  /** 중간 캐시 (2분) */
  MEDIUM: TIME_UNITS.MINUTE * 2,
  /** 긴 캐시 (5분) - 대부분의 데이터 */
  LONG: TIME_UNITS.MINUTE * 5,
  /** 매우 긴 캐시 (10분) - 스케줄 등 */
  EXTRA_LONG: TIME_UNITS.MINUTE * 10,
  /** 문서 캐시 (30분) */
  DOCUMENTS: TIME_UNITS.MINUTE * 30,
} as const;

// ========================================
// ML 서비스 설정
// ========================================
export const ML_SERVICE_CONFIG = {
  /** 기본 타임아웃 (10초) */
  DEFAULT_TIMEOUT: 10000,
  /** 헬스체크 타임아웃 (5초) */
  HEALTH_CHECK_TIMEOUT: 5000,
  /** 학습 타임아웃 (60초) - 학습은 더 오래 걸림 */
  TRAINING_TIMEOUT: 60000,
} as const;

// ========================================
// 인증 설정
// ========================================
export const AUTH_CONFIG = {
  /** 로그아웃 타임아웃 (2초) */
  SIGN_OUT_TIMEOUT: 2000,
} as const;

// ========================================
// 파일 업로드 설정
// ========================================
export const FILE_CONFIG = {
  /** 최대 CSV 파일 크기 (5MB) */
  MAX_CSV_SIZE: 5 * 1024 * 1024,
  /** 바이트 변환 기준 (1KB = 1024 bytes) */
  BYTES_PER_KB: 1024,
} as const;

// ========================================
// UI 설정
// ========================================
export const UI_CONFIG = {
  /** 기본 디바운스 딜레이 (300ms) */
  DEBOUNCE_DELAY: 300,
} as const;

// ========================================
// AI 자리배치 알고리즘 설정
// ========================================
export const FIXED_SEAT_CONFIG = {
  /** 고정석 판단 최소 출석 횟수 */
  MIN_APPEARANCES: 3,
  /** 높은 일관성 임계값 (80%) */
  HIGH_CONSISTENCY: 0.8,
  /** 열 위치 허용 오차 (±2열) */
  COL_TOLERANCE: 2,
} as const;

/** 기본 그리드 열 수 */
export const BASE_GRID_COLS = 15;

// ========================================
// 배치표 유사도 가중치
// ========================================
export const ARRANGEMENT_WEIGHTS = {
  /** 총 인원 유사도 가중치 (40%) */
  TOTAL_SIMILARITY: 0.4,
  /** 파트 비율 유사도 가중치 (60%) */
  RATIO_SIMILARITY: 0.6,
} as const;

// ========================================
// Vision/OCR 설정
// ========================================
export const VISION_CONFIG = {
  /** 기본 이미지 너비 (PDF 변환용) */
  DEFAULT_IMAGE_WIDTH: 2000,
  /** 최대 높이 필터 임계값 */
  MAX_HEIGHT_THRESHOLD: 500,
} as const;

// ========================================
// HTTP 상태 코드
// ========================================
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// ========================================
// 역할(Role) 상수
// ========================================
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: '관리자',
  CONDUCTOR: '지휘자',
  ACCOMPANIST: '반주자',
  MANAGER: '매니저',
  PART_LEADER: '파트장',
} as const;

/**
 * 역할 계층 (숫자가 높을수록 높은 권한)
 * - 배치/출석 수정: PART_LEADER 이상
 * - 배치표 생성: CONDUCTOR 이상
 * - 시스템 관리: ADMIN만
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  ADMIN: 100,
  CONDUCTOR: 80,
  ACCOMPANIST: 30,
  MANAGER: 60,
  PART_LEADER: 40,
} as const;

/**
 * 비등단 구성원(지휘자, 반주자 등)에게 부여 가능한 역할
 */
export const NON_SINGER_ROLES = ['CONDUCTOR', 'ACCOMPANIST'] as const;
