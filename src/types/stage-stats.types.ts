/**
 * 등단 통계 타입 정의
 * ml_arrangement_history 테이블 기반의 실제 배치 인원 통계
 */

/** 파트 타입 */
export type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS';

/** 파트별 평균 통계 */
export interface PartAverageStats {
  /** 평균 인원 */
  average: number;
  /** 전체 대비 비율 (백분율) */
  percentage: number;
  /** 총 인원 합계 */
  total: number;
}

/** 등단 통계 요약 */
export interface StageStatsSummary {
  /** 총 예배 횟수 */
  totalServices: number;
  /** 평균 등단 인원 */
  averageMembers: number;
  /** 최다 등단일 */
  maxDate: string;
  /** 최다 등단 인원 */
  maxCount: number;
  /** 최다 등단 예배 유형 */
  maxServiceType: string | null;
  /** 최소 등단일 */
  minDate: string;
  /** 최소 등단 인원 */
  minCount: number;
  /** 최소 등단 예배 유형 */
  minServiceType: string | null;
}

/** 월별 추이 통계 */
export interface MonthlyTrendStats {
  /** 월 (YYYY-MM) */
  month: string;
  /** 예배 횟수 */
  serviceCount: number;
  /** 평균 등단 인원 */
  averageMembers: number;
  /** 총 등단 인원 합계 */
  totalMembers: number;
}

/** 예배별 상세 통계 (일별) */
export interface DailyStageStats {
  /** 날짜 (YYYY-MM-DD) */
  date: string;
  /** 예배 유형 */
  serviceType: string | null;
  /** 총 등단 인원 */
  totalMembers: number;
  /** 파트별 인원 */
  partBreakdown: Record<Part, number>;
}

/** 등단 통계 API 응답 */
export interface StageStatisticsResponse {
  /** 요약 통계 */
  summary: StageStatsSummary;
  /** 파트별 평균 */
  partAverages: Record<Part, PartAverageStats>;
  /** 월별 추이 */
  monthlyTrend: MonthlyTrendStats[];
  /** 예배별 상세 (일별) */
  dailyStats: DailyStageStats[];
  /** 사용 가능한 예배 유형 목록 */
  serviceTypes: string[];
}

/** 등단 통계 API 요청 파라미터 */
export interface StageStatsParams {
  /** 시작 날짜 (YYYY-MM-DD) */
  startDate: string;
  /** 종료 날짜 (YYYY-MM-DD) */
  endDate: string;
  /** 예배 유형 필터 (선택) */
  serviceType?: string;
}
