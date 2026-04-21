'use client';

import { PenLine } from 'lucide-react';

import { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { Spinner } from '@/components/ui/spinner';

import { useAuth } from '@/hooks/useAuth';
import { useFeedPosts } from '@/hooks/usePosts';

import type { FeedCategory } from '@/types/community';

import CategoryFilter from './CategoryFilter';
import FeedCard from './FeedCard';
import FeedFilters from './FeedFilters';

export default function FeedList() {
  const { profile } = useAuth();
  const [category, setCategory] = useState<FeedCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');

  const activeCategory = category === 'all' ? undefined : category;
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useFeedPosts({
      category: activeCategory,
      search: search || undefined,
      date: date || undefined,
    });

  const handleSearchChange = useCallback((v: string) => setSearch(v), []);
  const handleDateChange = useCallback((v: string) => setDate(v), []);

  // 대원 연동 여부 (글쓰기 권한)
  const canWrite =
    profile?.role === 'ADMIN' ||
    !!(profile?.linked_member_id && profile?.link_status === 'approved');

  // 무한 스크롤
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = data?.pages.flatMap((page) => page.data) ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 검색 + 날짜 필터 */}
      <FeedFilters
        search={search}
        date={date}
        onSearchChange={handleSearchChange}
        onDateChange={handleDateChange}
      />

      {/* 카테고리 필터 */}
      <CategoryFilter selected={category} onChange={setCategory} />

      {/* 게시글 목록 */}
      {allPosts.length === 0 ? (
        <div className="py-12 text-center text-lg text-[var(--color-text-tertiary)]">
          {search || date
            ? '검색 결과가 없습니다.'
            : category === 'all'
              ? '아직 게시글이 없습니다.'
              : '해당 카테고리의 게시글이 없습니다.'}
        </div>
      ) : (
        allPosts.map((post) => <FeedCard key={post.id} post={post} />)
      )}

      {/* 무한 스크롤 트리거 */}
      <div ref={loadMoreRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner size="default" />
        </div>
      )}

      {/* 글쓰기 FAB — 하단 네비게이션 바 바로 위 */}
      {canWrite && (
        <Link
          href="/community/feed/new"
          className="fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-white shadow-lg transition-transform active:scale-95 hover:bg-[var(--color-primary-700)] lg:bottom-6"
        >
          <PenLine className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
}
