'use client';

import { CornerDownRight, Send, Trash2 } from 'lucide-react';

import { useState } from 'react';

import AuthorBadge from '@/components/features/community/common/AuthorBadge';
import TimeAgo from '@/components/features/community/common/TimeAgo';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import { useAuth } from '@/hooks/useAuth';
import { showError, showSuccess } from '@/lib/toast';

import type { CommentWithAuthor } from '@/types/community';

interface CommentSectionProps {
  postId: string;
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const { profile } = useAuth();
  const { data: comments, isLoading } = useComments(postId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      await createComment.mutateAsync({
        post_id: postId,
        content: content.trim(),
      });
      setContent('');
    } catch (e) {
      showError(e instanceof Error ? e.message : '댓글 작성에 실패했습니다.');
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    try {
      await createComment.mutateAsync({
        post_id: postId,
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
      await deleteComment.mutateAsync({ commentId, postId });
      showSuccess('댓글이 삭제되었습니다.');
    } catch (e) {
      showError(e instanceof Error ? e.message : '댓글 삭제에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-6 text-center text-[var(--color-text-tertiary)]">
        댓글을 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
        댓글 {comments?.length ? `${comments.length}` : ''}
      </h3>

      {/* 댓글 목록 */}
      {comments && comments.length > 0 ? (
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
        <p className="py-4 text-center text-[var(--color-text-tertiary)]">
          아직 댓글이 없습니다.
        </p>
      )}

      {/* 댓글 작성 */}
      <div className="flex gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
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
          className="shrink-0 self-end h-12 w-12"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// 개별 댓글 컴포넌트
// ============================================================
interface CommentItemProps {
  comment: CommentWithAuthor;
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
                  className="text-[var(--color-text-tertiary)] hover:text-[var(--color-error-500)] p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-[var(--color-text-primary)] text-base whitespace-pre-wrap">
              {comment.content}
            </p>
            {/* 답글 버튼 (대댓글이 아닌 경우만) */}
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
                        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-error-500)] p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[var(--color-text-primary)] text-base whitespace-pre-wrap">
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
          <div className="flex flex-col gap-1 shrink-0">
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
