/**
 * 출석 통계 React Query Hooks
 * Supabase RPC 함수를 호출하여 출석 통계 데이터를 조회하는 커스텀 훅
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
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
  const supabase = createClient();

  return useQuery({
    queryKey: ['attendance-statistics', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_attendance_statistics', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        throw new Error(`출석 통계 조회 실패: ${error.message}`);
      }

      return data as AttendanceStatistics;
    },
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5, // 5분 동안 캐시 유지
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
  const supabase = createClient();

  return useQuery({
    queryKey: ['part-attendance-statistics', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_part_attendance_statistics', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        throw new Error(`파트별 출석 통계 조회 실패: ${error.message}`);
      }

      return data as PartAttendanceStatistics[];
    },
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5, // 5분 동안 캐시 유지
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
  const supabase = createClient();

  return useQuery({
    queryKey: ['member-attendance-history', memberId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_member_attendance_history', {
        p_member_id: memberId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });

      if (error) {
        throw new Error(`회원 출석 이력 조회 실패: ${error.message}`);
      }

      return data as MemberAttendanceHistory[];
    },
    enabled: !!memberId,
    staleTime: 1000 * 60 * 5, // 5분 동안 캐시 유지
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
  const supabase = createClient();

  return useQuery({
    queryKey: ['attendance-summary-by-date', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_attendance_summary_by_date', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        throw new Error(`날짜별 출석 요약 조회 실패: ${error.message}`);
      }

      return data as AttendanceSummaryByDate[];
    },
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5, // 5분 동안 캐시 유지
  });
}
