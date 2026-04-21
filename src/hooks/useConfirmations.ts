import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

import type { PartConfirmationStatus } from '@/types/community';

// ============================================================
// 공지 확인 현황 조회 (파트별)
// ============================================================
export function useConfirmationStatus(postId: string | undefined) {
  return useQuery<PartConfirmationStatus[]>({
    queryKey: ['confirmations', postId],
    queryFn: async () => {
      const res = await fetch(
        `/api/community/posts/${postId}/confirmations`
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '확인 현황을 불러오는데 실패했습니다.');
      }
      return res.json();
    },
    enabled: !!postId,
    staleTime: STALE_TIME.SHORT,
  });
}

// ============================================================
// 공지 확인 처리 (수동 호출용)
// ============================================================
export function useConfirmPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/community/posts/${postId}/confirm`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '확인 처리에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['confirmations', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNoticeCount'] });
    },
  });
}

// ============================================================
// 미확인 공지 수 (네비게이션 뱃지용)
// ============================================================
export function useUnreadNoticeCount(enabled = true) {
  return useQuery<number>({
    queryKey: ['unreadNoticeCount'],
    queryFn: async () => {
      const res = await fetch('/api/community/posts/unread-count');
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count ?? 0;
    },
    enabled,
    staleTime: STALE_TIME.LONG, // 5분
    refetchInterval: STALE_TIME.LONG,
  });
}
