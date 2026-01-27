/**
 * useMyDashboardStatus Hook
 *
 * 대원용 대시보드 상태를 조회하는 React Query 훅
 */
import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';
import type { MyDashboardStatusResponse } from '@/app/api/dashboard/my-status/route';

/**
 * 내 대시보드 상태 조회
 *
 * 내 투표 여부, 내 좌석 위치, 최근 투표 이력을 조회합니다.
 *
 * @example
 * ```tsx
 * const { data: myStatus, isLoading } = useMyDashboardStatus();
 *
 * if (!myStatus?.isLinked) {
 *   return <MemberLinkBanner linkStatus={myStatus?.linkStatus} />;
 * }
 * ```
 */
export function useMyDashboardStatus() {
  return useQuery({
    queryKey: ['dashboard-my-status'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/my-status');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '내 상태를 불러오는데 실패했습니다');
      }

      return response.json() as Promise<MyDashboardStatusResponse>;
    },
    staleTime: STALE_TIME.MEDIUM, // 2분
    refetchOnWindowFocus: true,
  });
}

export default useMyDashboardStatus;
