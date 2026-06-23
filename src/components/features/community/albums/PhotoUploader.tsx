'use client';

import { ImagePlus, Loader2 } from 'lucide-react';

import { useState } from 'react';

import { useUploadAlbumPhotos } from '@/hooks/useAlbums';
import { useFileUpload, type UploadResult } from '@/hooks/useFileUpload';
import { showError, showSuccess } from '@/lib/toast';

interface PhotoUploaderProps {
  albumId: string;
  className?: string;
}

const MAX_BATCH = 20;

export default function PhotoUploader({
  albumId,
  className = '',
}: PhotoUploaderProps) {
  const { uploadImage } = useFileUpload();
  const uploadPhotos = useUploadAlbumPhotos(albumId);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArr = Array.from(files).slice(0, MAX_BATCH);
    if (files.length > MAX_BATCH) {
      showError(`한 번에 최대 ${MAX_BATCH}장까지만 업로드할 수 있습니다.`);
    }

    const uploaded: Array<{
      file_path: string;
      file_size: number;
    }> = [];

    setBatchProgress({ current: 0, total: filesArr.length });

    try {
      for (let i = 0; i < filesArr.length; i++) {
        const file = filesArr[i];
        if (!file.type.startsWith('image/')) {
          showError(`'${file.name}'은(는) 이미지 파일이 아닙니다.`);
          continue;
        }
        try {
          const result: UploadResult = await uploadImage(file, 'community/albums');
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
        await uploadPhotos.mutateAsync({ photos: uploaded });
        showSuccess(`사진 ${uploaded.length}장이 추가되었습니다.`);
      }
    } finally {
      setBatchProgress(null);
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
