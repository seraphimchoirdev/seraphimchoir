'use client';

import { Plus } from 'lucide-react';

import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';

import NoticeCard from '@/components/features/community/notices/NoticeCard';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

import { useAuth } from '@/hooks/useAuth';
import { useNotices } from '@/hooks/usePosts';

export default function NoticeList() {
  const { profile } = useAuth();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotices();

  // 공지 작성 권한
  const canWrite = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY'].includes(
    profile?.role || ''
  );

  // 무한 스크롤: IntersectionObserver
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  // pinned 공지와 일반 공지 분리
  const pinned = data?.pages[0]?.pinned || [];
  const allPosts = data?.pages.flatMap((p) => p.data) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 작성 버튼 */}
      {canWrite && (
        <div className="flex justify-end">
          <Link href="/community/notices/new">
            <Button size="lg" className="text-base px-6 py-3 h-auto">
              <Plus className="mr-2 h-5 w-5" />
              공지 작성
            </Button>
          </Link>
        </div>
      )}

      {/* 고정 공지 */}
      {pinned.length > 0 && (
        <div className="space-y-2">
          {pinned.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </div>
      )}

      {/* 일반 공지 */}
      {allPosts.length > 0 ? (
        <div className="space-y-2">
          {allPosts.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </div>
      ) : (
        pinned.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--color-border-default)] py-16 text-center">
            <p className="text-lg text-[var(--color-text-tertiary)]">
              등록된 공지사항이 없습니다.
            </p>
          </div>
        )
      )}

      {/* 무한 스크롤 트리거 */}
      <div ref={loadMoreRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner size="default" />
        </div>
      )}
    </div>
  );
}
