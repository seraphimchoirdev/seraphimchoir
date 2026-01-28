/**
 * useConductorStatus Hook
 *
 * 지휘자용 대시보드 상태를 조회하는 React Query 훅
 */
import { useQuery } from '@tanstack/react-query';

import { STALE_TIME, TIME_UNITS } from '@/lib/constants';
import type { ConductorStatusResponse } from '@/app/api/dashboard/conductor-status/route';

/**
 * 지휘자 대시보드 상태 조회
 *
 * 배치 작업 현황, 출석 현황 요약을 조회합니다.
 *
 * @example
 * ```tsx
 * const { data: status, isLoading } = useConductorStatus();
 *
 * if (status?.latestArrangement?.status === 'DRAFT') {
 *   return <ArrangementActionCard arrangement={status.latestArrangement} />;
 * }
 * ```
 */
export function useConductorStatus() {
  return useQuery({
    queryKey: ['dashboard-conductor-status'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/conductor-status');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '지휘자 상태를 불러오는데 실패했습니다');
      }

      return response.json() as Promise<ConductorStatusResponse>;
    },
    staleTime: STALE_TIME.DEFAULT, // 1분
    refetchInterval: TIME_UNITS.MINUTE, // 1분 주기 자동 갱신
    refetchOnWindowFocus: true, // 탭 복귀 시 갱신
  });
}

export default useConductorStatus;
