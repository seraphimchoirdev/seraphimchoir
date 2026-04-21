'use client';

import {
  ArrowLeft,
  CheckCircle,
  ClipboardList,
  Edit,
  Heart,
  Paperclip,
  Trash2,
} from 'lucide-react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import AuthorBadge from '@/components/features/community/common/AuthorBadge';
import CommentSection from '@/components/features/community/common/CommentSection';
import TimeAgo from '@/components/features/community/common/TimeAgo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Spinner } from '@/components/ui/spinner';

import { useAuth } from '@/hooks/useAuth';
import { useDeletePost, usePost, useToggleLike } from '@/hooks/usePosts';
import { showError, showSuccess } from '@/lib/toast';

import { useState } from 'react';

const PRIORITY_CONFIG = {
  urgent: { label: '긴급', variant: 'destructive' as const },
  important: { label: '중요', variant: 'warning' as const },
  normal: { label: '', variant: 'default' as const },
};

interface NoticeDetailProps {
  id: string;
}

export default function NoticeDetail({ id }: NoticeDetailProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: post, isLoading } = usePost(id);
  const toggleLike = useToggleLike();
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

  const priority =
    PRIORITY_CONFIG[post.priority as keyof typeof PRIORITY_CONFIG] ||
    PRIORITY_CONFIG.normal;
  const isAuthor = post.author_id === profile?.id;
  const isManager = ['ADMIN', 'CONDUCTOR', 'MANAGER'].includes(
    profile?.role || ''
  );
  const canEdit = isAuthor || isManager;
  const canViewConfirmations =
    isManager ||
    profile?.role === 'SECRETARY' ||
    profile?.role === 'PART_LEADER';

  const handleLike = async () => {
    try {
      await toggleLike.mutateAsync(id);
    } catch (e) {
      showError(e instanceof Error ? e.message : '좋아요 처리 실패');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(id);
      showSuccess('공지가 삭제되었습니다.');
      router.push('/community/notices');
    } catch (e) {
      showError(e instanceof Error ? e.message : '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-base"
      >
        <ArrowLeft className="h-5 w-5" />
        목록으로
      </button>

      {/* 메인 카드 */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-6">
        {/* 뱃지 */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          {post.is_pinned && (
            <Badge variant="default" className="text-sm">고정 공지</Badge>
          )}
          {priority.label && (
            <Badge variant={priority.variant} className="text-sm">
              {priority.label}
            </Badge>
          )}
          {post.requires_confirmation && (
            <Badge
              variant={post.is_confirmed_by_me ? 'success' : 'warning'}
              className="text-sm"
            >
              {post.is_confirmed_by_me ? (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> 확인완료
                </span>
              ) : (
                '확인 필요'
              )}
            </Badge>
          )}
        </div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
          {post.title}
        </h1>

        {/* 작성자 + 시간 */}
        <div className="mt-3 flex items-center gap-3">
          <AuthorBadge author={post.author} />
          <TimeAgo
            date={post.created_at ?? ''}
            className="text-sm text-[var(--color-text-tertiary)]"
          />
        </div>

        {/* 본문 */}
        <div className="mt-6 text-lg leading-relaxed text-[var(--color-text-primary)] whitespace-pre-wrap">
          {post.content}
        </div>

        {/* 첨부파일 */}
        {post.attachments.length > 0 && (
          <div className="mt-6 space-y-2 border-t border-[var(--color-border-subtle)] pt-4">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              <Paperclip className="mr-1 inline h-4 w-4" />
              첨부파일 ({post.attachments.length})
            </p>
            {post.attachments.map((att) => (
              <a
                key={att.id}
                href={att.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-[var(--color-border-default)] p-3 text-base text-[var(--color-primary-600)] hover:bg-[var(--color-background-secondary)]"
              >
                {att.file_name}
              </a>
            ))}
          </div>
        )}

        {/* 액션 바 */}
        <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-4">
          <div className="flex items-center gap-3">
            {/* 좋아요 */}
            <button
              onClick={handleLike}
              disabled={toggleLike.isPending}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-base transition-colors ${
                post.is_liked_by_me
                  ? 'bg-[var(--color-error-100)] text-[var(--color-error-600)]'
                  : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)]'
              }`}
            >
              <Heart
                className={`h-5 w-5 ${post.is_liked_by_me ? 'fill-current' : ''}`}
              />
              {(post.like_count ?? 0) > 0 && post.like_count}
            </button>

            {/* 확인 현황 (권한 있는 경우) */}
            {post.requires_confirmation && canViewConfirmations && (
              <Link href={`/community/notices/${id}/confirmations`}>
                <Button variant="outline" size="lg" className="text-base h-auto py-2">
                  <ClipboardList className="mr-2 h-5 w-5" />
                  확인 현황
                </Button>
              </Link>
            )}
          </div>

          {/* 수정/삭제 */}
          {canEdit && (
            <div className="flex items-center gap-2">
              <Link href={`/community/notices/${id}/edit`}>
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <Edit className="h-5 w-5" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 text-[var(--color-error-500)]"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 댓글 */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-6">
        <CommentSection postId={id} />
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="공지 삭제"
        description="이 공지사항을 삭제하시겠습니까? 삭제된 공지는 복구할 수 없습니다."
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
