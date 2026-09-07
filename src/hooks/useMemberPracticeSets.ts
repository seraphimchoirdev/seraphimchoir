/**
 * 신입대원 연습 세트 진행 상황 훅
 */
'use client';

import type {
  MemberPracticeSetProgress,
  MemberPracticeSetsResponse,
} from '@/app/api/members/practice-sets/route';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

export type { MemberPracticeSetProgress, MemberPracticeSetsResponse };

/**
 * 신입대원 전원의 세트 진행 상황을 조회한다.
 *
 * 대원 목록의 페이지네이션과 분리되어 있다(집계 API가 파라미터를 받지 않는다).
 * 목록 2페이지의 신입도 배지가 보여야 하기 때문이다.
 *
 * @example
 * ```tsx
 * const { data: practiceSets } = useMemberPracticeSets();
 * const progress = practiceSets?.data[member.id];
 * // progress?.completed / progress?.required / progress?.isEligible
 * ```
 */
export function useMemberPracticeSets(
  enabled = true
): UseQueryResult<MemberPracticeSetsResponse, Error> {
  return useQuery({
    queryKey: ['members', 'practice-sets'],
    queryFn: async () => {
      const response = await fetch('/api/members/practice-sets');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '연습 세트 현황을 불러오는데 실패했습니다');
      }

      return response.json();
    },
    enabled,
    // 출석 저장 직후 값이 바뀌므로 길게 잡지 않는다. 출석 화면에서 저장하면
    // ['members'] 계열이 무효화되어 어차피 다시 불러온다.
    staleTime: STALE_TIME.MEDIUM,
  });
}
