import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

import type {
  CreatePostRequest,
  NoticeListResponse,
  PostWithAuthor,
  UpdatePostRequest,
} from '@/types/community';

// ============================================================
// 공지 목록 (무한 스크롤, pinned 분리)
// ============================================================
export function useNotices() {
  return useInfiniteQuery<NoticeListResponse>({
    queryKey: ['posts', 'notice'],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ type: 'notice', limit: '20' });
      if (pageParam) params.set('cursor', pageParam as string);

      const res = await fetch(`/api/community/posts?${params}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '공지사항을 불러오는데 실패했습니다.');
      }
      return res.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: STALE_TIME.SHORT,
  });
}

// ============================================================
// 피드 목록 (무한 스크롤)
// ============================================================
export function useFeedPosts(filters?: {
  category?: string;
  search?: string;
  date?: string;
}) {
  const { category, search, date } = filters || {};

  return useInfiniteQuery({
    queryKey: ['posts', 'feed', category, search, date],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ type: 'feed', limit: '20' });
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      if (date) params.set('date', date);
      if (pageParam) params.set('cursor', pageParam as string);

      const res = await fetch(`/api/community/posts?${params}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '게시글을 불러오는데 실패했습니다.');
      }
      return res.json() as Promise<{
        data: PostWithAuthor[];
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
// 단일 게시글 조회
// ============================================================
export function usePost(id: string | undefined) {
  return useQuery<PostWithAuthor>({
    queryKey: ['posts', id],
    queryFn: async () => {
      const res = await fetch(`/api/community/posts/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '게시글을 불러오는데 실패했습니다.');
      }
      return res.json();
    },
    enabled: !!id,
    staleTime: STALE_TIME.SHORT,
  });
}

// ============================================================
// 게시글 작성
// ============================================================
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePostRequest) => {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '게시글 작성에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ============================================================
// 게시글 수정
// ============================================================
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePostRequest;
    }) => {
      const res = await fetch(`/api/community/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '게시글 수정에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ============================================================
// 게시글 삭제 (soft delete)
// ============================================================
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/community/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_deleted: true }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '게시글 삭제에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ============================================================
// 좋아요 토글
// ============================================================
export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '좋아요 처리에 실패했습니다.');
      }
      return res.json() as Promise<{ liked: boolean; like_count: number }>;
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['posts', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
