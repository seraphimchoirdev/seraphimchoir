'use client';

import { CornerDownRight, Send, Trash2 } from 'lucide-react';

import { useState } from 'react';

import AuthorBadge from '@/components/features/community/common/AuthorBadge';
import TimeAgo from '@/components/features/community/common/TimeAgo';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

import { useAuth } from '@/hooks/useAuth';
import {
  useCreatePhotoComment,
  useDeletePhotoComment,
  usePhotoComments,
} from '@/hooks/usePhotoInteractions';
import { showError, showSuccess } from '@/lib/toast';

import type { PhotoCommentWithAuthor } from '@/types/community';

interface PhotoCommentSheetProps {
  albumId: string;
  photoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 사진 댓글 바텀 시트.
 * CommentSection(게시글 댓글)의 트리/대댓글/삭제 UI를 사진 훅으로 복제했다.
 */
export default function PhotoCommentSheet({
  albumId,
  photoId,
  open,
  onOpenChange,
}: PhotoCommentSheetProps) {
  const { profile } = useAuth();
  const { data: comments, isLoading } = usePhotoComments(
    albumId,
    open ? photoId : undefined
  );
  const createComment = useCreatePhotoComment(albumId);
  const deleteComment = useDeletePhotoComment(albumId);

  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      await createComment.mutateAsync({ photoId, content: content.trim() });
      setContent('');
    } catch (e) {
      showError(e instanceof Error ? e.message : '댓글 작성에 실패했습니다.');
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    try {
      await createComment.mutateAsync({
        photoId,
        parent_id: parentId,
        content: replyContent.trim(),
      });
      setReplyTo(null);
      setReplyContent('');
    } catch (e) {
      showError(e instanceof Error ? e.message : '답글 작성에 실패했습니다.');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ photoId, commentId });
      showSuccess('댓글이 삭제되었습니다.');
    } catch (e) {
      showError(e instanceof Error ? e.message : '댓글 삭제에 실패했습니다.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[80vh] flex-col p-0"
      >
        <SheetHeader className="shrink-0 border-b border-[var(--color-border-subtle)] text-left">
          <SheetTitle>댓글 {comments?.length ? comments.length : ''}</SheetTitle>
        </SheetHeader>

        {/* 댓글 목록 (스크롤 영역) */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <p className="py-6 text-center text-[var(--color-text-tertiary)]">
              댓글을 불러오는 중...
            </p>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={profile?.id}
                  onReply={(id) => {
                    setReplyTo(id);
                    setReplyContent('');
                  }}
                  onDelete={handleDelete}
                  replyTo={replyTo}
                  replyContent={replyContent}
                  onReplyContentChange={setReplyContent}
                  onReplySubmit={handleReply}
                  onReplyCancel={() => setReplyTo(null)}
                  isReplying={createComment.isPending}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-[var(--color-text-tertiary)]">
              아직 댓글이 없습니다.
            </p>
          )}
        </div>

        {/* 댓글 작성 (하단 고정) */}
        <div className="shrink-0 border-t border-[var(--color-border-subtle)] px-4 py-3">
          <div className="flex gap-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="min-h-[48px] resize-none text-base"
              maxLength={500}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!content.trim() || createComment.isPending}
              className="h-12 w-12 shrink-0 self-end"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// 개별 댓글 (CommentSection의 CommentItem 복제)
// ============================================================
interface CommentItemProps {
  comment: PhotoCommentWithAuthor;
  currentUserId?: string;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
  replyTo: string | null;
  replyContent: string;
  onReplyContentChange: (v: string) => void;
  onReplySubmit: (parentId: string) => void;
  onReplyCancel: () => void;
  isReplying: boolean;
}

function CommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
  replyTo,
  replyContent,
  onReplyContentChange,
  onReplySubmit,
  onReplyCancel,
  isReplying,
}: CommentItemProps) {
  const isDeleted = comment.is_deleted;
  const isOwner = !isDeleted && comment.author_id === currentUserId;

  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-[var(--color-background-secondary)] p-3">
        {isDeleted ? (
          <p className="text-[var(--color-text-tertiary)] italic">
            삭제된 댓글입니다.
          </p>
        ) : (
          <>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AuthorBadge author={comment.author} size="sm" />
                <TimeAgo
                  date={comment.created_at ?? ''}
                  className="text-xs text-[var(--color-text-tertiary)]"
                />
              </div>
              {isOwner && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-error-500)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-base whitespace-pre-wrap text-[var(--color-text-primary)]">
              {comment.content}
            </p>
            {!comment.parent_id && (
              <button
                onClick={() => onReply(comment.id)}
                className="mt-1 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-primary-600)]"
              >
                답글
              </button>
            )}
          </>
        )}
      </div>

      {/* 대댓글 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-6 space-y-2">
          {comment.replies.map((reply) => (
            <div
              key={reply.id}
              className="rounded-lg bg-[var(--color-background-tertiary)] p-3"
            >
              {reply.is_deleted ? (
                <p className="text-[var(--color-text-tertiary)] italic">
                  삭제된 댓글입니다.
                </p>
              ) : (
                <>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CornerDownRight className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                      <AuthorBadge author={reply.author} size="sm" />
                      <TimeAgo
                        date={reply.created_at ?? ''}
                        className="text-xs text-[var(--color-text-tertiary)]"
                      />
                    </div>
                    {reply.author_id === currentUserId && (
                      <button
                        onClick={() => onDelete(reply.id)}
                        className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-error-500)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-base whitespace-pre-wrap text-[var(--color-text-primary)]">
                    {reply.content}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 답글 입력 */}
      {replyTo === comment.id && (
        <div className="ml-6 flex gap-2">
          <Textarea
            value={replyContent}
            onChange={(e) => onReplyContentChange(e.target.value)}
            placeholder="답글을 입력하세요..."
            className="min-h-[40px] resize-none text-base"
            maxLength={500}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onReplySubmit(comment.id);
              }
              if (e.key === 'Escape') {
                onReplyCancel();
              }
            }}
          />
          <div className="flex shrink-0 flex-col gap-1">
            <Button
              size="sm"
              onClick={() => onReplySubmit(comment.id)}
              disabled={!replyContent.trim() || isReplying}
            >
              등록
            </Button>
            <Button size="sm" variant="ghost" onClick={onReplyCancel}>
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
