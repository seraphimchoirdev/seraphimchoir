import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

import type { CommentWithAuthor } from '@/types/community';

// ============================================================
// 댓글 목록 조회 (트리 구조)
// ============================================================
export function useComments(postId: string | undefined) {
  return useQuery<CommentWithAuthor[]>({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const res = await fetch(
        `/api/community/comments?postId=${postId}`
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '댓글을 불러오는데 실패했습니다.');
      }
      return res.json();
    },
    enabled: !!postId,
    staleTime: STALE_TIME.SHORT,
  });
}

// ============================================================
// 댓글 작성
// ============================================================
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      post_id: string;
      parent_id?: string;
      content: string;
    }) => {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '댓글 작성에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['comments', variables.post_id],
      });
      // comment_count 갱신을 위해 게시글도 invalidate
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ============================================================
// 댓글 삭제 (soft delete)
// ============================================================
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
    }: {
      commentId: string;
      postId: string;
    }) => {
      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '댓글 삭제에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['comments', variables.postId],
      });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
