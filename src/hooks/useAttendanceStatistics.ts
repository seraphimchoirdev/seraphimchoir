/**
 * 출석 통계 React Query Hooks
 * API Route를 통해 출석 통계 데이터를 조회하는 커스텀 훅
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/constants';
import type {
  AttendanceStatistics,
  PartAttendanceStatistics,
  MemberAttendanceHistory,
  AttendanceSummaryByDate,
} from '@/types/attendance-stats.types';

/**
 * 전체 출석 통계 조회 훅
 *
 * @param startDate - 시작 날짜 (YYYY-MM-DD)
 * @param endDate - 종료 날짜 (YYYY-MM-DD)
 * @returns 전체 출석 통계 데이터
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useAttendanceStatistics('2025-01-01', '2025-01-31');
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * return (
 *   <div>
 *     <p>총 기록: {data?.total_records}</p>
 *     <p>출석률: {data?.attendance_rate}%</p>
 *   </div>
 * );
 * ```
 */
export function useAttendanceStatistics(
  startDate: string,
  endDate: string
): UseQueryResult<AttendanceStatistics, Error> {
  return useQuery({
    queryKey: ['attendance-statistics', startDate, endDate],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendances/stats?start_date=${startDate}&end_date=${endDate}&type=overall`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '출석 통계 조회 실패');
      }

      return response.json() as Promise<AttendanceStatistics>;
    },
    enabled: !!startDate && !!endDate,
    staleTime: STALE_TIME.LONG, // 5분
  });
}

/**
 * 파트별 출석 통계 조회 훅
 *
 * @param startDate - 시작 날짜 (YYYY-MM-DD)
 * @param endDate - 종료 날짜 (YYYY-MM-DD)
 * @returns 파트별 출석 통계 배열
 *
 * @example
 * ```tsx
 * const { data, isLoading } = usePartAttendanceStatistics('2025-01-01', '2025-03-31');
 *
 * return (
 *   <table>
 *     <tbody>
 *       {data?.map(stat => (
 *         <tr key={stat.part}>
 *           <td>{stat.part}</td>
 *           <td>{stat.attendance_rate}%</td>
 *         </tr>
 *       ))}
 *     </tbody>
 *   </table>
 * );
 * ```
 */
export function usePartAttendanceStatistics(
  startDate: string,
  endDate: string
): UseQueryResult<PartAttendanceStatistics[], Error> {
  return useQuery({
    queryKey: ['part-attendance-statistics', startDate, endDate],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendances/stats?start_date=${startDate}&end_date=${endDate}&type=part`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '파트별 출석 통계 조회 실패');
      }

      return response.json() as Promise<PartAttendanceStatistics[]>;
    },
    enabled: !!startDate && !!endDate,
    staleTime: STALE_TIME.LONG, // 5분
  });
}

/**
 * 회원 출석 이력 조회 훅
 *
 * @param memberId - 회원 UUID
 * @param startDate - 시작 날짜 (선택사항, YYYY-MM-DD)
 * @param endDate - 종료 날짜 (선택사항, YYYY-MM-DD)
 * @returns 회원의 출석 이력 배열 (날짜 역순)
 *
 * @example
 * ```tsx
 * // 전체 이력 조회
 * const { data } = useMemberAttendanceHistory('uuid-here');
 *
 * // 기간 지정 조회
 * const { data } = useMemberAttendanceHistory('uuid-here', '2025-01-01', '2025-01-31');
 *
 * return (
 *   <ul>
 *     {data?.map((record, idx) => (
 *       <li key={idx}>
 *         {record.date}: {record.is_available ? '출석' : '결석'}
 *         {record.notes && ` - ${record.notes}`}
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useMemberAttendanceHistory(
  memberId: string,
  startDate?: string,
  endDate?: string
): UseQueryResult<MemberAttendanceHistory[], Error> {
  return useQuery({
    queryKey: ['member-attendance-history', memberId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ member_id: memberId });
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/attendances/stats/history?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '회원 출석 이력 조회 실패');
      }

      return response.json() as Promise<MemberAttendanceHistory[]>;
    },
    enabled: !!memberId,
    staleTime: STALE_TIME.LONG, // 5분
  });
}

/**
 * 날짜별 출석 요약 통계 조회 훅
 *
 * @param startDate - 시작 날짜 (YYYY-MM-DD)
 * @param endDate - 종료 날짜 (YYYY-MM-DD)
 * @returns 날짜별 출석 요약 통계 배열
 *
 * @example
 * ```tsx
 * const { data } = useAttendanceSummaryByDate('2025-01-01', '2025-01-31');
 *
 * return (
 *   <table>
 *     <tbody>
 *       {data?.map(summary => (
 *         <tr key={summary.date}>
 *           <td>{summary.date}</td>
 *           <td>{summary.available_count}/{summary.total_count}</td>
 *           <td>{summary.attendance_rate}%</td>
 *         </tr>
 *       ))}
 *     </tbody>
 *   </table>
 * );
 * ```
 */
export function useAttendanceSummaryByDate(
  startDate: string,
  endDate: string
): UseQueryResult<AttendanceSummaryByDate[], Error> {
  return useQuery({
    queryKey: ['attendance-summary-by-date', startDate, endDate],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendances/stats?start_date=${startDate}&end_date=${endDate}&type=date`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '날짜별 출석 요약 조회 실패');
      }

      return response.json() as Promise<AttendanceSummaryByDate[]>;
    },
    enabled: !!startDate && !!endDate,
    staleTime: STALE_TIME.LONG, // 5분
  });
}
