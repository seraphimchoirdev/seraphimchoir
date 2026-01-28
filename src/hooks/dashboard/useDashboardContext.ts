/**
 * useDashboardContext Hook
 *
 * 대시보드 시간 컨텍스트 및 관련 정보를 조회하는 React Query 훅
 */
import { useQuery } from '@tanstack/react-query';

import { STALE_TIME, TIME_UNITS } from '@/lib/constants';
import type { DashboardContext } from '@/lib/dashboard-context';

/**
 * 대시보드 컨텍스트 조회
 *
 * 현재 사용자의 시간 컨텍스트, 다음 예배 정보, 투표 마감 정보 등을 조회합니다.
 *
 * @example
 * ```tsx
 * const { data: context, isLoading } = useDashboardContext();
 *
 * if (context?.timeContext === 'VOTE_NEEDED') {
 *   return <VoteActionCard />;
 * }
 * ```
 */
export function useDashboardContext() {
  return useQuery({
    queryKey: ['dashboard-context'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/context');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '컨텍스트를 불러오는데 실패했습니다');
      }

      return response.json() as Promise<DashboardContext>;
    },
    staleTime: STALE_TIME.DEFAULT, // 1분
    refetchInterval: TIME_UNITS.MINUTE, // 1분 주기 자동 갱신
    refetchOnWindowFocus: true, // 탭 복귀 시 갱신
  });
}

export default useDashboardContext;
