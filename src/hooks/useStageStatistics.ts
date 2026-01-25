/**
 * 등단 통계 React Query Hook
 * ml_arrangement_history 테이블 기반의 실제 배치 인원 통계 조회
 */
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

import type { StageStatisticsResponse, StageStatsParams } from '@/types/stage-stats.types';

/**
 * 등단 통계 조회 훅
 *
 * @param params - 조회 파라미터 (시작일, 종료일, 예배유형)
 * @returns 등단 통계 데이터 (요약, 파트별, 월별, 일별)
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useStageStatistics({
 *   startDate: '2025-01-01',
 *   endDate: '2025-12-31',
 *   serviceType: '2부예배',
 * });
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * return (
 *   <div>
 *     <p>총 예배: {data?.summary.totalServices}회</p>
 *     <p>평균 인원: {data?.summary.averageMembers}명</p>
 *   </div>
 * );
 * ```
 */
export function useStageStatistics(
  params: StageStatsParams
): UseQueryResult<StageStatisticsResponse, Error> {
  const { startDate, endDate, serviceType } = params;

  return useQuery({
    queryKey: ['stage-statistics', startDate, endDate, serviceType],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });

      if (serviceType) {
        searchParams.set('service_type', serviceType);
      }

      const response = await fetch(`/api/arrangements/stats?${searchParams}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '등단 통계 조회 실패');
      }

      return response.json() as Promise<StageStatisticsResponse>;
    },
    enabled: !!startDate && !!endDate,
    staleTime: STALE_TIME.LONG, // 5분
  });
}
