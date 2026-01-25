/**
 * 대원별 출석 통계 훅
 */
'use client';

import type {
  MemberAttendanceStats,
  MemberAttendanceStatsResponse,
} from '@/app/api/attendances/stats/members/route';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

export type { MemberAttendanceStats, MemberAttendanceStatsResponse };

interface UseMemberAttendanceStatsParams {
  startDate: string;
  endDate: string;
  part?: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';
  sortBy?: 'attendance_rate' | 'name' | 'total_records';
  order?: 'asc' | 'desc';
}

/**
 * 대원별 출석 통계 조회 훅
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useMemberAttendanceStats({
 *   startDate: '2025-01-01',
 *   endDate: '2025-01-31',
 *   sortBy: 'attendance_rate',
 *   order: 'desc',
 * });
 *
 * return (
 *   <table>
 *     {data?.members.map(member => (
 *       <tr key={member.memberId}>
 *         <td>{member.memberName}</td>
 *         <td>{member.attendanceRate}%</td>
 *       </tr>
 *     ))}
 *   </table>
 * );
 * ```
 */
export function useMemberAttendanceStats(
  params: UseMemberAttendanceStatsParams
): UseQueryResult<MemberAttendanceStatsResponse, Error> {
  const { startDate, endDate, part, sortBy = 'attendance_rate', order = 'desc' } = params;

  return useQuery({
    queryKey: ['member-attendance-stats', startDate, endDate, part, sortBy, order],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        sort_by: sortBy,
        order,
      });

      if (part) {
        searchParams.set('part', part);
      }

      const response = await fetch(`/api/attendances/stats/members?${searchParams.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '대원별 출석 통계를 불러오는데 실패했습니다');
      }

      return response.json();
    },
    enabled: !!startDate && !!endDate,
    staleTime: STALE_TIME.LONG, // 5분
  });
}
