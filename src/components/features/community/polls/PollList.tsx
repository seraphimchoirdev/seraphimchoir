'use client';

import { PenLine } from 'lucide-react';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { Spinner } from '@/components/ui/spinner';

import { useAuth } from '@/hooks/useAuth';
import { usePolls } from '@/hooks/usePolls';

import { POLL_CREATOR_ROLES } from '@/lib/community/poll-constants';
import { cn } from '@/lib/utils';

import PollCard, { PollEmptyState } from './PollCard';

const STATUS_TABS = [
  { value: 'active', label: '진행 중' },
  { value: 'closed', label: '마감' },
] as const;

export default function PollList() {
  const { profile } = useAuth();
  const [status, setStatus] = useState<'active' | 'closed'>('active');

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    usePolls(status);

  // 설문 생성 권한: 운영진 + 파트장 (파트장은 자기 파트 대상만 — 폼에서 강제)
  const canCreate =
    POLL_CREATOR_ROLES.includes(profile?.role || '') &&
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

  const allPolls = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="space-y-4">
      {/* 상단: 상태 탭 + 만들기 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-[var(--color-background-tertiary)] p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                status === tab.value
                  ? 'bg-[var(--color-background-primary)] text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {canCreate && (
          <Link
            href="/community/polls/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-700)]"
          >
            <PenLine className="h-4 w-4" />
            설문 만들기
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : allPolls.length === 0 ? (
        <PollEmptyState status={status} />
      ) : (
        <div className="space-y-3">
          {allPolls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}

      {/* 무한 스크롤 sentinel */}
      <div ref={loadMoreRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      )}
    </div>
  );
}
