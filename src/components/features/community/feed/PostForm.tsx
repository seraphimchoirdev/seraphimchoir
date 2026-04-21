'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea';

import { useCreatePost, usePost, useUpdatePost } from '@/hooks/usePosts';
import { showError, showSuccess } from '@/lib/toast';

import type { FeedCategory } from '@/types/community';

import ImageUploader, { type ImageAttachment } from './ImageUploader';

const CATEGORY_OPTIONS: Array<{ value: FeedCategory; label: string }> = [
  { value: 'daily', label: '일상' },
  { value: 'prayer', label: '기도요청' },
  { value: 'performance', label: '공연소식' },
  { value: 'celebration', label: '경조사' },
  { value: 'sharing', label: '나눔' },
];

interface PostFormProps {
  editId?: string;
}

export default function PostForm({ editId }: PostFormProps) {
  const router = useRouter();
  const isEdit = !!editId;
  const { data: existingPost } = usePost(editId);
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();

  const [content, setContent] = useState(existingPost?.content || '');
  const [category, setCategory] = useState<FeedCategory>(
    (existingPost?.category as FeedCategory) || 'daily'
  );
  const [images, setImages] = useState<ImageAttachment[]>([]);

  // edit 모드에서 기존 데이터 로드
  const [initialized, setInitialized] = useState(!isEdit);
  if (isEdit && existingPost && !initialized) {
    setContent(existingPost.content || '');
    setCategory((existingPost.category as FeedCategory) || 'daily');
    setInitialized(true);
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      showError('내용을 입력해주세요.');
      return;
    }

    try {
      if (isEdit && editId) {
        await updatePost.mutateAsync({
          id: editId,
          data: {
            content: content.trim(),
            category,
          },
        });
        showSuccess('게시글이 수정되었습니다.');
        router.push(`/community/feed/${editId}`);
      } else {
        await createPost.mutateAsync({
          post_type: 'feed',
          content: content.trim(),
          category,
          attachments: images.length > 0 ? images : undefined,
        });
        showSuccess('게시글이 등록되었습니다.');
        router.push('/community/feed');
      }
    } catch (err) {
      showError(
        err instanceof Error ? err.message : '게시글 저장에 실패했습니다.'
      );
    }
  };

  const isPending = createPost.isPending || updatePost.isPending;

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-base text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-5 w-5" />
        돌아가기
      </button>

      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-6">
        <h2 className="mb-6 text-xl font-bold text-[var(--color-text-primary)]">
          {isEdit ? '게시글 수정' : '새 글 작성'}
        </h2>

        <div className="space-y-5">
          {/* 카테고리 선택 */}
          <div>
            <Label className="text-base font-medium">카테고리</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as FeedCategory)}
            >
              <SelectTrigger className="mt-1.5 h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-base py-2"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              placeholder="찬양대원들과 나누고 싶은 이야기를 적어주세요"
              maxLength={5000}
              rows={8}
              className="mt-1.5 text-lg leading-relaxed"
            />
          </div>

          {/* 이미지 첨부 (새 글 작성 시만) */}
          {!isEdit && (
            <div>
              <Label className="text-base font-medium">사진</Label>
              <div className="mt-1.5">
                <ImageUploader images={images} onChange={setImages} />
              </div>
            </div>
          )}

          {/* 제출 */}
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
              disabled={isPending}
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
