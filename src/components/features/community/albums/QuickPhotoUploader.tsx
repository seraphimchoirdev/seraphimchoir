'use client';

import { ImagePlus, Loader2 } from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';

import { useQuickUploadPhotos } from '@/hooks/useAlbums';
import { useBatchImageUpload } from '@/hooks/useBatchImageUpload';
import { showSuccess } from '@/lib/toast';

interface QuickPhotoUploaderProps {
  /** 버튼 스타일 변형 */
  variant?: 'primary' | 'secondary' | 'icon';
  /** 업로드 후 자동 앨범으로 이동할지 여부 (기본 false: 토스트만) */
  navigateAfter?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function QuickPhotoUploader({
  variant = 'secondary',
  navigateAfter = false,
  className = '',
  children,
}: QuickPhotoUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadBatch, batchProgress } = useBatchImageUpload();
  const quickUpload = useQuickUploadPhotos();

  const isUploading = !!batchProgress || quickUpload.isPending;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const uploaded = await uploadBatch(files);
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
