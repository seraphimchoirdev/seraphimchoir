'use client';

import { useCallback, useState } from 'react';

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * R2 파일 업로드 훅
 * - 이미지 압축 (browser-image-compression)
 * - /api/files/upload로 POST
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadImage = useCallback(
    async (file: File, prefix: string): Promise<UploadResult> => {
      setUploading(true);
      setProgress(0);

      try {
        // 동적 import (client-only 라이브러리)
        const imageCompression = (await import('browser-image-compression'))
          .default;

        setProgress(10);

        // 클라이언트 압축
        const compressed = await imageCompression(file, {
          maxSizeMB: 5,
          maxWidthOrHeight: 1920,
          fileType: 'image/webp',
          onProgress: (p: number) => setProgress(10 + p * 0.6),
        });

        setProgress(70);

        // FormData 구성
        const formData = new FormData();
        const fileName = file.name.replace(/\.[^.]+$/, '.webp');
        formData.append('file', compressed, fileName);
        formData.append('bucket', 'public');
        formData.append('prefix', prefix);

        const res = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        setProgress(90);

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || '파일 업로드에 실패했습니다.');
        }

        const result = await res.json();
        setProgress(100);
        return result;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const uploadFile = useCallback(
    async (
      file: File,
      prefix: string,
      bucket: 'public' | 'private' = 'public'
    ): Promise<UploadResult> => {
      setUploading(true);
      setProgress(0);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        formData.append('prefix', prefix);

        setProgress(30);

        const res = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        setProgress(90);

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || '파일 업로드에 실패했습니다.');
        }

        const result = await res.json();
        setProgress(100);
        return result;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return { uploadImage, uploadFile, uploading, progress };
}
