import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

import type {
  CreatePollRequest,
  PollDetail,
  PollWithMeta,
  SubmitPollResponseRequest,
  UpdatePollRequest,
} from '@/types/community';

// ============================================================
// 설문 목록 (무한 스크롤, 진행 중/마감 탭)
// ============================================================
export function usePolls(status: 'active' | 'closed') {
  return useInfiniteQuery({
    queryKey: ['polls', status],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ status, limit: '20' });
      if (pageParam) params.set('cursor', pageParam as string);

      const res = await fetch(`/api/community/polls?${params}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '설문 목록을 불러오는데 실패했습니다.');
      }
      return res.json() as Promise<{
        data: PollWithMeta[];
        nextCursor: string | null;
        hasMore: boolean;
      }>;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: STALE_TIME.SHORT,
  });
}

// ============================================================
// 설문 상세
// ============================================================
export function usePoll(id: string | undefined) {
  return useQuery<PollDetail>({
    queryKey: ['polls', 'detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/community/polls/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '설문을 불러오는데 실패했습니다.');
      }
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(id),
    staleTime: STALE_TIME.SHORT,
  });
}

// ============================================================
// 설문 생성
// ============================================================
export function useCreatePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePollRequest) => {
      const res = await fetch('/api/community/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '설문 생성에 실패했습니다.');
      }
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}

// ============================================================
// 설문 수정 (마감 처리 포함)
// ============================================================
export function useUpdatePoll(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePollRequest) => {
      const res = await fetch(`/api/community/polls/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '설문 수정에 실패했습니다.');
      }
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}

// ============================================================
// 설문 삭제
// ============================================================
export function useDeletePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/community/polls/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '설문 삭제에 실패했습니다.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}

// ============================================================
// 투표/응답 제출 (재응답 = 교체)
// ============================================================
export function useSubmitPollResponse(pollId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitPollResponseRequest) => {
      const res = await fetch(`/api/community/polls/${pollId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '응답 제출에 실패했습니다.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}

// ============================================================
// 내 응답 취소
// ============================================================
export function useCancelPollResponse(pollId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/community/polls/${pollId}/responses`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '응답 취소에 실패했습니다.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}
