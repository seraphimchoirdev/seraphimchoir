/**
 * 출석 통계 RPC 함수 반환 타입 정의
 * Supabase RPC functions에서 반환되는 데이터의 TypeScript 타입
 */

/**
 * 전체 출석 통계
 * get_attendance_statistics() 함수의 반환 타입
 */
export interface AttendanceStatistics {
  /** 총 출석 기록 수 */
  total_records: number;
  /** 출석 가능한 기록 수 */
  available_count: number;
  /** 출석 불가능한 기록 수 */
  unavailable_count: number;
  /** 출석률 (백분율, 소수점 2자리) */
  attendance_rate: number;
}

/**
 * 파트별 출석 통계
 * get_part_attendance_statistics() 함수의 반환 타입
 */
export interface PartAttendanceStatistics {
  /** 파트 (SOPRANO, ALTO, TENOR, BASS, SPECIAL) */
  part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';
  /** 해당 파트의 총 출석 기록 수 */
  total_count: number;
  /** 출석 가능한 기록 수 */
  available_count: number;
  /** 출석 불가능한 기록 수 */
  unavailable_count: number;
  /** 출석률 (백분율, 소수점 2자리) */
  attendance_rate: number;
}

/**
 * 회원 출석 이력
 * get_member_attendance_history() 함수의 반환 타입
 */
export interface MemberAttendanceHistory {
  /** 출석 날짜 (ISO 8601 format: YYYY-MM-DD) */
  date: string;
  /** 출석 가능 여부 */
  is_available: boolean;
  /** 출석 관련 메모 (선택사항) */
  notes: string | null;
}

/**
 * 날짜별 출석 요약 통계
 * get_attendance_summary_by_date() 함수의 반환 타입
 */
export interface AttendanceSummaryByDate {
  /** 날짜 (ISO 8601 format: YYYY-MM-DD) */
  date: string;
  /** 해당 날짜의 총 출석 기록 수 */
  total_count: number;
  /** 출석 가능한 기록 수 */
  available_count: number;
  /** 출석 불가능한 기록 수 */
  unavailable_count: number;
  /** 출석률 (백분율, 소수점 2자리) */
  attendance_rate: number;
}

/**
 * RPC 함수 파라미터 타입
 */
export interface AttendanceStatsParams {
  p_start_date: string; // ISO 8601 date format (YYYY-MM-DD)
  p_end_date: string; // ISO 8601 date format (YYYY-MM-DD)
}

export interface MemberAttendanceHistoryParams {
  p_member_id: string; // UUID
  p_start_date?: string | null; // ISO 8601 date format (YYYY-MM-DD), 선택사항
  p_end_date?: string | null; // ISO 8601 date format (YYYY-MM-DD), 선택사항
}
