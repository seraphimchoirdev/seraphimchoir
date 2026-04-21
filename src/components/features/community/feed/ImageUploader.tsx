'use client';

import { ImagePlus, Loader2, X } from 'lucide-react';

import { useFileUpload, type UploadResult } from '@/hooks/useFileUpload';
import { showError } from '@/lib/toast';

export interface ImageAttachment {
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  sort_order: number;
}

interface ImageUploaderProps {
  images: ImageAttachment[];
  onChange: (images: ImageAttachment[]) => void;
  maxCount?: number;
}

export default function ImageUploader({
  images,
  onChange,
  maxCount = 5,
}: ImageUploaderProps) {
  const { uploadImage, uploading, progress } = useFileUpload();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (images.length >= maxCount) {
        showError(`이미지는 최대 ${maxCount}개까지 첨부할 수 있습니다.`);
        break;
      }

      if (!file.type.startsWith('image/')) {
        showError('이미지 파일만 첨부할 수 있습니다.');
        continue;
      }

      try {
        const result: UploadResult = await uploadImage(file, 'community/feed');
        onChange([
          ...images,
          {
            file_path: result.url || result.key,
            file_name: result.fileName,
            file_size: result.fileSize,
            mime_type: result.mimeType,
            sort_order: images.length,
          },
        ]);
      } catch (err) {
        showError(
          err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.'
        );
      }
    }

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* 미리보기 */}
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <div key={i} className="relative shrink-0">
              <img
                src={img.file_path}
                alt={img.file_name}
                className="h-24 w-24 rounded-lg object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-error-500)] text-white shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 업로드 버튼 */}
      {images.length < maxCount && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--color-border-default)] px-4 py-3 text-base text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]">
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              업로드 중... {Math.round(progress)}%
            </>
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              사진 첨부 ({images.length}/{maxCount})
            </>
          )}
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
