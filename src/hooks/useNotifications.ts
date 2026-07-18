import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationsPage {
  data: NotificationItem[];
  unreadCount: number;
  nextCursor: string | null;
}

// ============================================================
// 내 알림 목록 (무한 스크롤) + 미읽음 수
// ============================================================
export function useNotifications(enabled = true) {
  return useInfiniteQuery<NotificationsPage>({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set('cursor', pageParam as string);
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '알림을 불러오는데 실패했습니다.');
      }
      return res.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: STALE_TIME.SHORT,
    refetchInterval: STALE_TIME.LONG, // 5분 주기 갱신 (벨 뱃지)
  });
}

// ============================================================
// 읽음 처리 (ids 미지정 시 전체 읽음)
// ============================================================
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids?: string[]) => {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids && ids.length > 0 ? { ids } : {}),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '읽음 처리에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** 읽은 알림 전체 삭제 (알림함 '읽은 알림 지우기') */
export function useClearReadNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '알림 삭제에 실패했습니다.');
      }
      return res.json() as Promise<{ success: boolean; deleted: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
