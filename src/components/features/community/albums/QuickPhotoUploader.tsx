'use client';

import { ImagePlus, Loader2 } from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { useQuickUploadPhotos } from '@/hooks/useAlbums';
import { useFileUpload, type UploadResult } from '@/hooks/useFileUpload';
import { showError, showSuccess } from '@/lib/toast';

interface QuickPhotoUploaderProps {
  /** 버튼 스타일 변형 */
  variant?: 'primary' | 'secondary' | 'icon';
  /** 업로드 후 자동 앨범으로 이동할지 여부 (기본 false: 토스트만) */
  navigateAfter?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const MAX_BATCH = 20;

export default function QuickPhotoUploader({
  variant = 'secondary',
  navigateAfter = false,
  className = '',
  children,
}: QuickPhotoUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadImage } = useFileUpload();
  const quickUpload = useQuickUploadPhotos();

  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const isUploading = !!batchProgress || quickUpload.isPending;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArr = Array.from(files).slice(0, MAX_BATCH);
    if (files.length > MAX_BATCH) {
      showError(`한 번에 최대 ${MAX_BATCH}장까지만 업로드할 수 있습니다.`);
    }

    const uploaded: Array<{ file_path: string; file_size: number }> = [];
    setBatchProgress({ current: 0, total: filesArr.length });

    try {
      for (let i = 0; i < filesArr.length; i++) {
        const file = filesArr[i];
        if (!file.type.startsWith('image/')) {
          showError(`'${file.name}'은(는) 이미지 파일이 아닙니다.`);
          continue;
        }
        try {
          const result: UploadResult = await uploadImage(
            file,
            'community/albums'
          );
          uploaded.push({
            file_path: result.url || result.key,
            file_size: result.fileSize,
          });
        } catch (err) {
          showError(
            `'${file.name}' 업로드 실패: ${
              err instanceof Error ? err.message : '알 수 없는 오류'
            }`
          );
        }
        setBatchProgress({ current: i + 1, total: filesArr.length });
      }

      if (uploaded.length > 0) {
        const result = await quickUpload.mutateAsync({ photos: uploaded });
        showSuccess(
          `사진 ${result.added}장이 이번 달 앨범에 저장되었습니다.`
        );
        if (navigateAfter) {
          router.push(`/community/albums/${result.album_id}`);
        }
      }
    } finally {
      setBatchProgress(null);
      e.target.value = '';
    }
  };

  const baseClass =
    variant === 'primary'
      ? 'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)]'
      : variant === 'icon'
        ? 'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] h-14 w-14 rounded-full justify-center shadow-lg active:scale-95'
        : 'border border-[var(--color-border-default)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-secondary)]';

  const sizeClass =
    variant === 'icon' ? '' : 'rounded-lg px-4 py-2.5 text-sm font-medium';

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={isUploading}
      className={`inline-flex items-center gap-2 transition-colors disabled:opacity-50 ${baseClass} ${sizeClass} ${className}`}
      aria-label={variant === 'icon' ? '사진 빠른 업로드' : undefined}
    >
      {isUploading ? (
        <>
          <Loader2 className={variant === 'icon' ? 'h-6 w-6 animate-spin' : 'h-4 w-4 animate-spin'} />
          {variant !== 'icon' &&
            (batchProgress
              ? `업로드 중 (${batchProgress.current}/${batchProgress.total})`
              : '저장 중...')}
        </>
      ) : (
        <>
          <ImagePlus className={variant === 'icon' ? 'h-6 w-6' : 'h-4 w-4'} />
          {variant !== 'icon' && (children ?? '사진만 올리기')}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />
    </button>
  );
}
