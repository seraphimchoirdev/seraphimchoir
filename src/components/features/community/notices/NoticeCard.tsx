'use client';

import { CheckCircle, MessageSquare, Pin } from 'lucide-react';

import Link from 'next/link';

import AuthorBadge from '@/components/features/community/common/AuthorBadge';
import TimeAgo from '@/components/features/community/common/TimeAgo';
import { Badge } from '@/components/ui/badge';

import type { PostWithAuthor } from '@/types/community';

const PRIORITY_CONFIG = {
  urgent: { label: '긴급', variant: 'destructive' as const },
  important: { label: '중요', variant: 'warning' as const },
  normal: { label: '', variant: 'default' as const },
};

interface NoticeCardProps {
  notice: PostWithAuthor;
}

export default function NoticeCard({ notice }: NoticeCardProps) {
  const priority = PRIORITY_CONFIG[notice.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal;
  const isUnread =
    notice.requires_confirmation && !notice.is_confirmed_by_me;

  return (
    <Link
      href={`/community/notices/${notice.id}`}
      className="block rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-4 transition-colors hover:bg-[var(--color-background-secondary)] active:bg-[var(--color-background-tertiary)]"
    >
      <div className="flex items-start gap-3">
        {/* 미확인 표시 (큰 dot) */}
        {isUnread && (
          <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-[var(--color-error-500)]" />
        )}

        <div className="min-w-0 flex-1">
          {/* 상단: 뱃지 + 고정 */}
          <div className="mb-1.5 flex items-center gap-2 flex-wrap">
            {notice.is_pinned && (
              <span className="inline-flex items-center gap-1 text-sm text-[var(--color-primary-600)]">
                <Pin className="h-4 w-4" />
                <span className="font-medium">고정</span>
              </span>
            )}
            {priority.label && (
              <Badge variant={priority.variant} className="text-sm px-2 py-0.5">
                {priority.label}
              </Badge>
            )}
          </div>

          {/* 제목 (큰 글씨) */}
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] leading-snug">
            {notice.title}
          </h3>

          {/* 본문 미리보기 */}
          <p className="mt-1 text-base text-[var(--color-text-secondary)] line-clamp-2">
            {notice.content}
          </p>

          {/* 하단: 작성자 + 시간 + 댓글 */}
          <div className="mt-3 flex items-center gap-3 text-sm text-[var(--color-text-tertiary)]">
            <AuthorBadge author={notice.author} size="sm" showPart={false} />
            <TimeAgo date={notice.created_at ?? ''} />
            {(notice.comment_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {notice.comment_count}
              </span>
            )}
            {notice.requires_confirmation && notice.is_confirmed_by_me && (
              <span className="inline-flex items-center gap-1 text-[var(--color-success-600)]">
                <CheckCircle className="h-4 w-4" />
                확인완료
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
