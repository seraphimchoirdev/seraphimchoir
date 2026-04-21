'use client';

import { ArrowLeft, Loader2, Paperclip, X } from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { useFileUpload } from '@/hooks/useFileUpload';
import { useCreatePost, usePost, useUpdatePost } from '@/hooks/usePosts';
import { showError, showSuccess } from '@/lib/toast';

import type { NoticePriority, PostWithAuthor } from '@/types/community';

interface NoticeFormProps {
  editId?: string;
}

export default function NoticeForm({ editId }: NoticeFormProps) {
  const router = useRouter();
  const isEdit = !!editId;
  const { data: existingPost } = usePost(editId);
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const { uploadImage, uploading } = useFileUpload();

  // 폼 상태 (edit 모드에서 기존 값 로드)
  const [title, setTitle] = useState(existingPost?.title || '');
  const [content, setContent] = useState(existingPost?.content || '');
  const [priority, setPriority] = useState<NoticePriority>(
    (existingPost?.priority as NoticePriority) || 'normal'
  );
  const [isPinned, setIsPinned] = useState(existingPost?.is_pinned || false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(
    existingPost?.requires_confirmation || false
  );
  const [attachments, setAttachments] = useState<
    Array<{
      file_path: string;
      file_name: string;
      file_size: number;
      mime_type: string;
      sort_order: number;
    }>
  >([]);

  // edit 모드에서 기존 데이터가 로드되면 폼 업데이트
  const [initialized, setInitialized] = useState(!isEdit);
  if (isEdit && existingPost && !initialized) {
    setTitle(existingPost.title || '');
    setContent(existingPost.content || '');
    setPriority((existingPost.priority as NoticePriority) || 'normal');
    setIsPinned(existingPost.is_pinned || false);
    setRequiresConfirmation(existingPost.requires_confirmation || false);
    setInitialized(true);
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (attachments.length >= 5) {
        showError('첨부파일은 최대 5개까지 가능합니다.');
        break;
      }

      try {
        const result = await uploadImage(file, 'community/posts');
        setAttachments((prev) => [
          ...prev,
          {
            file_path: result.url || result.key,
            file_name: result.fileName,
            file_size: result.fileSize,
            mime_type: result.mimeType,
            sort_order: prev.length,
          },
        ]);
      } catch (err) {
        showError(
          err instanceof Error ? err.message : '파일 업로드에 실패했습니다.'
        );
      }
    }

    // input 초기화
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showError('제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      showError('내용을 입력해주세요.');
      return;
    }

    try {
      if (isEdit && editId) {
        await updatePost.mutateAsync({
          id: editId,
          data: {
            title: title.trim(),
            content: content.trim(),
            priority,
            is_pinned: isPinned,
            requires_confirmation: requiresConfirmation,
          },
        });
        showSuccess('공지가 수정되었습니다.');
        router.push(`/community/notices/${editId}`);
      } else {
        await createPost.mutateAsync({
          post_type: 'notice',
          title: title.trim(),
          content: content.trim(),
          priority,
          is_pinned: isPinned,
          requires_confirmation: requiresConfirmation,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        showSuccess('공지가 등록되었습니다.');
        router.push('/community/notices');
      }
    } catch (err) {
      showError(
        err instanceof Error ? err.message : '공지 저장에 실패했습니다.'
      );
    }
  };

  const isPending = createPost.isPending || updatePost.isPending;

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-base"
      >
        <ArrowLeft className="h-5 w-5" />
        돌아가기
      </button>

      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-6">
        <h2 className="mb-6 text-xl font-bold text-[var(--color-text-primary)]">
          {isEdit ? '공지 수정' : '새 공지사항'}
        </h2>

        <div className="space-y-5">
          {/* 제목 */}
          <div>
            <Label htmlFor="title" className="text-base font-medium">
              제목
            </Label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지 제목을 입력하세요"
              maxLength={200}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-background-primary)] px-4 py-3 text-lg focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)]"
            />
          </div>

          {/* 본문 */}
          <div>
            <Label htmlFor="content" className="text-base font-medium">
              내용
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지 내용을 입력하세요"
              maxLength={10000}
              rows={10}
              className="mt-1.5 text-lg leading-relaxed"
            />
          </div>

          {/* 옵션 행 */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* 중요도 */}
            <div>
              <Label className="text-base font-medium">중요도</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as NoticePriority)}
              >
                <SelectTrigger className="mt-1.5 h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal" className="text-base py-2">
                    일반
                  </SelectItem>
                  <SelectItem value="important" className="text-base py-2">
                    중요
                  </SelectItem>
                  <SelectItem value="urgent" className="text-base py-2">
                    긴급
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 토글 옵션 */}
          <div className="space-y-4 rounded-lg bg-[var(--color-background-secondary)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-[var(--color-text-primary)]">
                  상단 고정
                </p>
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  공지 목록 상단에 항상 표시됩니다
                </p>
              </div>
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-[var(--color-text-primary)]">
                  읽음 확인
                </p>
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  대원이 공지를 열람하면 자동으로 확인 처리됩니다
                </p>
              </div>
              <Switch
                checked={requiresConfirmation}
                onCheckedChange={setRequiresConfirmation}
              />
            </div>
          </div>

          {/* 첨부파일 (새 글 작성 시만) */}
          {!isEdit && (
            <div>
              <Label className="text-base font-medium">첨부파일</Label>
              <div className="mt-1.5">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--color-border-default)] px-4 py-3 text-base text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]">
                  <Paperclip className="h-5 w-5" />
                  {uploading ? '업로드 중...' : '파일 첨부 (최대 5개)'}
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading || attachments.length >= 5}
                  />
                </label>

                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg bg-[var(--color-background-secondary)] px-3 py-2"
                      >
                        <span className="flex-1 truncate text-sm">
                          {att.file_name}
                        </span>
                        <button
                          onClick={() => removeAttachment(i)}
                          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-error-500)]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="text-base h-auto py-3 px-6"
              onClick={() => router.back()}
            >
              취소
            </Button>
            <Button
              size="lg"
              className="text-base h-auto py-3 px-8"
              onClick={handleSubmit}
              disabled={isPending || uploading}
            >
              {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isEdit ? '수정' : '등록'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
