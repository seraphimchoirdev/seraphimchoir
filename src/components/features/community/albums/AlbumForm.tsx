'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  useAlbum,
  useCreateAlbum,
  useUpdateAlbum,
} from '@/hooks/useAlbums';
import { showError, showSuccess } from '@/lib/toast';

interface AlbumFormProps {
  editId?: string;
}

function todayKST(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function AlbumForm({ editId }: AlbumFormProps) {
  const router = useRouter();
  const isEdit = !!editId;
  const { data: existing } = useAlbum(editId);
  const createAlbum = useCreateAlbum();
  const updateAlbum = useUpdateAlbum(editId || '');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(todayKST());
  const [initialized, setInitialized] = useState(!isEdit);

  // edit 모드: 기존 데이터 로드 (PostForm 패턴 — 렌더 도중 1회 setState)
  if (isEdit && existing && !initialized) {
    setTitle(existing.title || '');
    setDescription(existing.description || '');
    setEventDate(existing.event_date || todayKST());
    setInitialized(true);
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      showError('제목을 입력해주세요.');
      return;
    }
    if (!eventDate) {
      showError('행사 날짜를 선택해주세요.');
      return;
    }

    try {
      if (isEdit && editId) {
        await updateAlbum.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          event_date: eventDate,
        });
        showSuccess('앨범이 수정되었습니다.');
        router.push(`/community/albums/${editId}`);
      } else {
        const album = await createAlbum.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          event_date: eventDate,
        });
        showSuccess('앨범이 생성되었습니다.');
        router.push(`/community/albums/${album.id}`);
      }
    } catch (err) {
      showError(
        err instanceof Error ? err.message : '저장에 실패했습니다.'
      );
    }
  };

  const submitting = createAlbum.isPending || updateAlbum.isPending;

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="뒤로가기"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          {isEdit ? '앨범 수정' : '새 앨범 만들기'}
        </h1>
      </div>

      {/* 제목 */}
      <div className="space-y-2">
        <Label htmlFor="album-title">제목 *</Label>
        <Input
          id="album-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 2026 부활절 칸타타"
          maxLength={100}
        />
      </div>

      {/* 행사 날짜 */}
      <div className="space-y-2">
        <Label htmlFor="album-date">행사 날짜 *</Label>
        <Input
          id="album-date"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
      </div>

      {/* 설명 */}
      <div className="space-y-2">
        <Label htmlFor="album-desc">설명 (선택)</Label>
        <Textarea
          id="album-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="앨범에 대한 짧은 설명"
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-[var(--color-text-tertiary)]">
          {description.length}/500
        </p>
      </div>

      {/* 액션 */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
          className="flex-1"
        >
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              저장 중
            </>
          ) : isEdit ? (
            '수정'
          ) : (
            '만들기'
          )}
        </Button>
      </div>
    </div>
  );
}
