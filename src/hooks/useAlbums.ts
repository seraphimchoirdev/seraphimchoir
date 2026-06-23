import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

import type {
  AlbumPhotoWithUploader,
  AlbumWithMeta,
  CreateAlbumRequest,
  CursorPage,
  UpdateAlbumRequest,
  UploadAlbumPhotosRequest,
} from '@/types/community';

// ============================================================
// 앨범 목록 (무한 스크롤)
// ============================================================
export function useAlbums(filters?: { search?: string; year?: string }) {
  const { search, year } = filters || {};

  return useInfiniteQuery({
    queryKey: ['albums', 'list', search, year],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam as string);
      if (search) params.set('search', search);
      if (year) params.set('year', year);

      const res = await fetch(`/api/community/albums?${params}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '앨범을 불러오는데 실패했습니다.');
      }
      return res.json() as Promise<CursorPage<AlbumWithMeta>>;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: STALE_TIME.SHORT,
  });
}

// ============================================================
// 단일 앨범 조회
// ============================================================
export function useAlbum(id: string | undefined) {
  return useQuery<AlbumWithMeta>({
    queryKey: ['albums', 'detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/community/albums/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '앨범을 불러오는데 실패했습니다.');
      }
      return res.json();
    },
    enabled: !!id,
    staleTime: STALE_TIME.SHORT,
  });
}

// ============================================================
// 앨범 사진 목록 (무한 스크롤)
// ============================================================
export function useAlbumPhotos(albumId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['albums', 'photos', albumId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '30' });
      if (pageParam) params.set('cursor', pageParam as string);
      const res = await fetch(
        `/api/community/albums/${albumId}/photos?${params}`
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '사진을 불러오는데 실패했습니다.');
      }
      return res.json() as Promise<CursorPage<AlbumPhotoWithUploader>>;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!albumId,
    staleTime: STALE_TIME.SHORT,
  });
}

// ============================================================
// 앨범 생성
// ============================================================
export function useCreateAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAlbumRequest) => {
      const res = await fetch('/api/community/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '앨범 생성에 실패했습니다.');
      }
      return res.json() as Promise<AlbumWithMeta>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums', 'list'] });
    },
  });
}

// ============================================================
// 앨범 수정
// ============================================================
export function useUpdateAlbum(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateAlbumRequest) => {
      const res = await fetch(`/api/community/albums/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '앨범 수정에 실패했습니다.');
      }
      return res.json() as Promise<AlbumWithMeta>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['albums', 'detail', id] });
    },
  });
}

// ============================================================
// 앨범 삭제 (soft delete)
// ============================================================
export function useDeleteAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/community/albums/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_deleted: true }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '앨범 삭제에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums', 'list'] });
    },
  });
}

// ============================================================
// 사진 일괄 추가
// ============================================================
export function useUploadAlbumPhotos(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UploadAlbumPhotosRequest) => {
      const res = await fetch(`/api/community/albums/${albumId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '사진 업로드에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums', 'photos', albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums', 'detail', albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums', 'list'] });
    },
  });
}

// ============================================================
// 앨범 없이 빠르게 사진 업로드 (자동 월별 앨범)
// ============================================================
export function useQuickUploadPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UploadAlbumPhotosRequest) => {
      const res = await fetch('/api/community/albums/quick-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '사진 업로드에 실패했습니다.');
      }
      return res.json() as Promise<{
        album_id: string;
        added: number;
        data: unknown[];
      }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['albums', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['albums', 'photos', result.album_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['albums', 'detail', result.album_id],
      });
    },
  });
}

// ============================================================
// 사진 단건 삭제
// ============================================================
export function useDeleteAlbumPhoto(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(
        `/api/community/albums/${albumId}/photos/${photoId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '사진 삭제에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums', 'photos', albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums', 'detail', albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums', 'list'] });
    },
  });
}
