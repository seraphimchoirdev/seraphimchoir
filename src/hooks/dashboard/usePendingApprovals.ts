/**
 * usePendingApprovals Hook
 *
 * 대기 중인 승인 건을 조회하는 React Query 훅 (ADMIN 전용)
 */
import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';
import type { PendingApprovalsResponse } from '@/app/api/dashboard/pending-approvals/route';

/**
 * 대기 중인 승인 건 조회
 *
 * ADMIN 역할인 경우에만 데이터를 조회합니다.
 *
 * @param enabled ADMIN 역할 여부
 */
export function usePendingApprovals(enabled: boolean = true) {
  return useQuery({
    queryKey: ['dashboard-pending-approvals'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/pending-approvals');

      if (!response.ok) {
        // 403은 권한 없음이므로 에러로 처리하지 않음
        if (response.status === 403) {
          return { pendingApprovals: [], totalCount: 0 };
        }
        const error = await response.json();
        throw new Error(error.error || '승인 대기 건을 불러오는데 실패했습니다');
      }

      return response.json() as Promise<PendingApprovalsResponse>;
    },
    staleTime: STALE_TIME.MEDIUM, // 2분
    enabled,
    refetchOnWindowFocus: true,
  });
}

export default usePendingApprovals;
