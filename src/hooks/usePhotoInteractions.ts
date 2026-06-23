import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

import type {
  PhotoCommentWithAuthor,
  TogglePhotoReactionResponse,
} from '@/types/community';

const photoBase = (albumId: string, photoId: string) =>
  `/api/community/albums/${albumId}/photos/${photoId}`;

// ============================================================
// 이모지 반응 토글
// ============================================================
export function useTogglePhotoReaction(albumId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    TogglePhotoReactionResponse,
    Error,
    { photoId: string; emoji: string }
  >({
    mutationFn: async ({ photoId, emoji }) => {
      const res = await fetch(`${photoBase(albumId, photoId)}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '반응 처리에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: () => {
      // 사진 목록의 my_reaction / reaction_counts 갱신
      queryClient.invalidateQueries({
        queryKey: ['albums', 'photos', albumId],
      });
    },
  });
}

// ============================================================
// 사진 댓글 목록 조회 (트리 구조)
// ============================================================
export function usePhotoComments(
  albumId: string,
  photoId: string | undefined
) {
  return useQuery<PhotoCommentWithAuthor[]>({
    queryKey: ['photo-comments', albumId, photoId],
    queryFn: async () => {
      const res = await fetch(`${photoBase(albumId, photoId!)}/comments`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '댓글을 불러오는데 실패했습니다.');
      }
      return res.json();
    },
    enabled: !!photoId,
    staleTime: STALE_TIME.SHORT,
  });
}

// ============================================================
// 사진 댓글 작성
// ============================================================
export function useCreatePhotoComment(albumId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      photoId: string;
      parent_id?: string;
      content: string;
    }) => {
      const res = await fetch(`${photoBase(albumId, data.photoId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: data.parent_id,
          content: data.content,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '댓글 작성에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['photo-comments', albumId, variables.photoId],
      });
      // comment_count 갱신을 위해 사진 목록도 invalidate
      queryClient.invalidateQueries({
        queryKey: ['albums', 'photos', albumId],
      });
    },
  });
}

// ============================================================
// 사진 댓글 삭제 (soft delete)
// ============================================================
export function useDeletePhotoComment(albumId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      photoId,
      commentId,
    }: {
      photoId: string;
      commentId: string;
    }) => {
      const res = await fetch(
        `${photoBase(albumId, photoId)}/comments/${commentId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '댓글 삭제에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['photo-comments', albumId, variables.photoId],
      });
      queryClient.invalidateQueries({
        queryKey: ['albums', 'photos', albumId],
      });
    },
  });
}
