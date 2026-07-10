'use client';

import { ImagePlus, Loader2 } from 'lucide-react';

import { useUploadAlbumPhotos } from '@/hooks/useAlbums';
import { useBatchImageUpload } from '@/hooks/useBatchImageUpload';
import { showSuccess } from '@/lib/toast';

interface PhotoUploaderProps {
  albumId: string;
  className?: string;
}

export default function PhotoUploader({
  albumId,
  className = '',
}: PhotoUploaderProps) {
  const { uploadBatch, batchProgress } = useBatchImageUpload();
  const uploadPhotos = useUploadAlbumPhotos(albumId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const uploaded = await uploadBatch(files);
      if (uploaded.length > 0) {
        await uploadPhotos.mutateAsync({ photos: uploaded });
        showSuccess(`사진 ${uploaded.length}장이 추가되었습니다.`);
      }
    } finally {
      e.target.value = '';
    }
  };

  const isUploading =
    !!batchProgress || uploadPhotos.isPending;

  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-700)] disabled:opacity-50 ${className}`}
    >
      {isUploading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {batchProgress
            ? `업로드 중 (${batchProgress.current}/${batchProgress.total})`
            : '저장 중...'}
        </>
      ) : (
        <>
          <ImagePlus className="h-4 w-4" />
          사진 추가
        </>
      )}
      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />
    </label>
  );
}
