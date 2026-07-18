'use client';

import { Bell, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useState } from 'react';

import TimeAgo from '@/components/features/community/common/TimeAgo';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useClearReadNotifications,
  useMarkNotificationsRead,
  useNotifications,
  type NotificationItem,
} from '@/hooks/useNotifications';
import { showSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';

/**
 * 헤더 알림 벨 — 미읽음 뱃지 + 알림 목록 드롭다운
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotifications();
  const markRead = useMarkNotificationsRead();
  const clearRead = useClearReadNotifications();

  const notifications = data?.pages.flatMap((page) => page.data) ?? [];
  const unreadCount = data?.pages[0]?.unreadCount ?? 0;
  const hasReadItems = notifications.some((n) => !!n.read_at);

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read_at) {
      markRead.mutate([item.id]);
    }
    setOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative rounded-full p-2 transition-colors hover:bg-[var(--color-background-tertiary)]"
          aria-label={unreadCount > 0 ? `알림 ${unreadCount}건 안읽음` : '알림'}
        >
          <Bell className="h-5 w-5 text-[var(--color-text-secondary)]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-error-500,#ef4444)] px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">알림</h3>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={() => markRead.mutate(undefined)}
                className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                모두 읽음
              </button>
            )}
            {hasReadItems && (
              <button
                onClick={() =>
                  clearRead.mutate(undefined, {
                    onSuccess: (res) => showSuccess(`읽은 알림 ${res.deleted}건을 지웠습니다.`),
                  })
                }
                disabled={clearRead.isPending}
                className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-error-500,#ef4444)] disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                읽은 알림 지우기
              </button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-tertiary)]" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
              알림이 없습니다
            </p>
          ) : (
            <ul>
              {notifications.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      'w-full border-b border-[var(--color-border-subtle)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-background-secondary)]',
                      !item.read_at && 'bg-[var(--color-primary-50)]'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!item.read_at && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary-500)]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-text-secondary)]">
                          {item.body}
                        </p>
                        <TimeAgo
                          date={item.created_at}
                          className="mt-1 block text-[11px] text-[var(--color-text-tertiary)]"
                        />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hasNextPage && (
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '더 보기'
                )}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
