'use client';

import { Heart, MessageSquare } from 'lucide-react';

import Link from 'next/link';

import AuthorBadge from '@/components/features/community/common/AuthorBadge';
import TimeAgo from '@/components/features/community/common/TimeAgo';

import type { FeedCategory, PostWithAuthor } from '@/types/community';

const CATEGORY_LABELS: Record<string, string> = {
  performance: '공연소식',
  celebration: '경조사',
  sharing: '나눔',
  daily: '일상',
  prayer: '기도요청',
};

interface FeedCardProps {
  post: PostWithAuthor;
}

export default function FeedCard({ post }: FeedCardProps) {
  const categoryLabel = post.category
    ? CATEGORY_LABELS[post.category] || post.category
    : null;

  const imageAttachments = post.attachments?.filter((a) =>
    a.mime_type?.startsWith('image/')
  );

  return (
    <Link
      href={`/community/feed/${post.id}`}
      className="block rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-5 transition-colors hover:bg-[var(--color-background-secondary)]"
    >
      {/* 상단: 작성자 + 시간 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AuthorBadge author={post.author} size="sm" />
          <TimeAgo
            date={post.created_at ?? ''}
            className="text-sm text-[var(--color-text-tertiary)]"
          />
        </div>
        {categoryLabel && (
          <span className="rounded-full bg-[var(--color-background-tertiary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
            {categoryLabel}
          </span>
        )}
      </div>

      {/* 본문 */}
      <p className="mt-3 text-base leading-relaxed text-[var(--color-text-primary)] line-clamp-3">
        {post.content}
      </p>

      {/* 이미지 미리보기 */}
      {imageAttachments && imageAttachments.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-hidden">
          {imageAttachments.slice(0, 3).map((img, i) => (
            <div key={i} className="relative">
              <img
                src={img.file_path ?? ''}
                alt=""
                className="h-20 w-20 rounded-lg object-cover"
              />
              {i === 2 && imageAttachments.length > 3 && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-sm font-bold text-white">
                  +{imageAttachments.length - 3}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 하단: 좋아요 + 댓글 */}
      <div className="mt-3 flex items-center gap-4 text-sm text-[var(--color-text-tertiary)]">
        <span className="inline-flex items-center gap-1">
          <Heart
            className={`h-4 w-4 ${post.is_liked_by_me ? 'fill-[var(--color-error-500)] text-[var(--color-error-500)]' : ''}`}
          />
          {(post.like_count ?? 0) > 0 && post.like_count}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          {(post.comment_count ?? 0) > 0 && post.comment_count}
        </span>
      </div>
    </Link>
  );
}
