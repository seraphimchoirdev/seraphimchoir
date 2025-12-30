/**
 * 배치 분석 타입 정의
 */

/**
 * 배치율 정보
 */
export interface PlacementRate {
  /** 배치된 인원 */
  placed: number;
  /** 등단 가능 인원 */
  available: number;
  /** 비율 (0-100) */
  percentage: number;
}

/**
 * 파트별 분포 정보
 */
export interface PartDistributionInfo {
  /** 배치된 인원 수 */
  count: number;
  /** 배치된 열 목록 (중복 제거) */
  columns: number[];
  /** 배치된 행 목록 (중복 제거) */
  rows: number[];
  /** 열 범위 (min-max) */
  columnRange: {
    min: number;
    max: number;
  } | null;
}

/**
 * 행별 분포 정보
 */
export interface RowDistributionInfo {
  /** 행 번호 (0-based) */
  row: number;
  /** 해당 줄 전체 좌석 수 */
  totalSeats: number;
  /** 배치된 인원 */
  occupied: number;
  /** 파트별 인원 */
  partBreakdown: Record<string, number>;
}

/**
 * 분석 요약 정보
 */
export interface AnalysisSummary {
  /** 종합 점수 (0-100) */
  overallScore: number;
  /** 요약 메시지 */
  message: string;
}

/**
 * 배치 분석 응답
 */
export interface ArrangementAnalysisResponse {
  /** 배치율 */
  placementRate: PlacementRate;
  /** 파트별 분포 */
  partDistribution: Record<string, PartDistributionInfo>;
  /** 행별 현황 */
  rowDistribution: RowDistributionInfo[];
  /** 요약 */
  summary: AnalysisSummary;
}
