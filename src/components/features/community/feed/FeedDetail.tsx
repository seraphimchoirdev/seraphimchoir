'use client';

import { ArrowLeft, Edit3, Trash2 } from 'lucide-react';

import { useRouter } from 'next/navigation';

import AuthorBadge from '@/components/features/community/common/AuthorBadge';
import CommentSection from '@/components/features/community/common/CommentSection';
import LikeButton from '@/components/features/community/common/LikeButton';
import TimeAgo from '@/components/features/community/common/TimeAgo';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Spinner } from '@/components/ui/spinner';

import { useAuth } from '@/hooks/useAuth';
import { useDeletePost, usePost } from '@/hooks/usePosts';
import { showError, showSuccess } from '@/lib/toast';

import { useState } from 'react';

import Link from 'next/link';

const CATEGORY_LABELS: Record<string, string> = {
  performance: '공연소식',
  celebration: '경조사',
  sharing: '나눔',
  daily: '일상',
  prayer: '기도요청',
};

interface FeedDetailProps {
  id: string;
}

export default function FeedDetail({ id }: FeedDetailProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: post, isLoading } = usePost(id);
  const deletePost = useDeletePost();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-12 text-center text-lg text-[var(--color-text-tertiary)]">
        게시글을 찾을 수 없습니다.
      </div>
    );
  }

  const isAuthor = profile?.id === post.author_id;
  const isAdmin = profile?.role === 'ADMIN';
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;

  const categoryLabel = post.category
    ? CATEGORY_LABELS[post.category] || post.category
    : null;

  const imageAttachments = post.attachments?.filter((a) =>
    a.mime_type?.startsWith('image/')
  );

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(id);
      showSuccess('게시글이 삭제되었습니다.');
      router.push('/community/feed');
    } catch {
      showError('게시글 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-base text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-5 w-5" />
        목록으로
      </button>

      <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-6">
        {/* 작성자 + 카테고리 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AuthorBadge author={post.author} />
            <TimeAgo
              date={post.created_at ?? ''}
              className="text-sm text-[var(--color-text-tertiary)]"
            />
          </div>
          {categoryLabel && (
            <span className="rounded-full bg-[var(--color-background-tertiary)] px-3 py-1 text-sm font-medium text-[var(--color-text-secondary)]">
              {categoryLabel}
            </span>
          )}
        </div>

        {/* 본문 */}
        <div className="mt-5 text-lg leading-relaxed text-[var(--color-text-primary)] whitespace-pre-wrap">
          {post.content}
        </div>

        {/* 이미지 */}
        {imageAttachments && imageAttachments.length > 0 && (
          <div className="mt-5 space-y-3">
            {imageAttachments.map((img, i) => (
              <img
                key={i}
                src={img.file_path ?? ''}
                alt={img.file_name ?? ''}
                className="w-full rounded-lg"
              />
            ))}
          </div>
        )}

        {/* 액션 바 */}
        <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-4">
          <LikeButton
            postId={id}
            isLiked={!!post.is_liked_by_me}
            likeCount={post.like_count ?? 0}
          />

          <div className="flex items-center gap-2">
            {canEdit && (
              <Link href={`/community/feed/${id}/edit`}>
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-base h-auto py-2"
                >
                  <Edit3 className="mr-1.5 h-4 w-4" />
                  수정
                </Button>
              </Link>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="lg"
                className="text-base h-auto py-2 text-[var(--color-error-600)] hover:text-[var(--color-error-700)]"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                삭제
              </Button>
            )}
          </div>
        </div>
      </article>

      {/* 댓글 */}
      <CommentSection postId={id} />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="게시글 삭제"
        description="이 게시글을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다."
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
