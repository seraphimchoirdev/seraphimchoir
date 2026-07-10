'use client';

import { useState } from 'react';

import { useFileUpload, type UploadResult } from '@/hooks/useFileUpload';
import { showError } from '@/lib/toast';

export interface UploadedPhoto {
  file_path: string;
  file_size: number;
}

export interface BatchProgress {
  current: number;
  total: number;
}

const DEFAULT_MAX_BATCH = 20;

/**
 * 이미지 여러 장을 R2에 순차 업로드하는 공용 훅.
 * PhotoUploader/QuickPhotoUploader가 같은 배치 로직(타입 검증, 진행률,
 * 파일별 에러 토스트)을 공유한다 — 정책 변경 시 이 훅만 수정하면 된다.
 */
export function useBatchImageUpload(options?: {
  folder?: string;
  maxBatch?: number;
}) {
  const folder = options?.folder ?? 'community/albums';
  const maxBatch = options?.maxBatch ?? DEFAULT_MAX_BATCH;

  const { uploadImage } = useFileUpload();
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(
    null
  );

  /**
   * 선택된 파일들을 업로드하고 성공한 파일 목록을 반환한다.
   * 이미지가 아닌 파일과 개별 실패는 토스트로 알리고 건너뛴다.
   */
  const uploadBatch = async (files: FileList): Promise<UploadedPhoto[]> => {
    const filesArr = Array.from(files).slice(0, maxBatch);
    if (files.length > maxBatch) {
      showError(`한 번에 최대 ${maxBatch}장까지만 업로드할 수 있습니다.`);
    }

    const uploaded: UploadedPhoto[] = [];
    setBatchProgress({ current: 0, total: filesArr.length });

    try {
      for (let i = 0; i < filesArr.length; i++) {
        const file = filesArr[i];
        if (!file.type.startsWith('image/')) {
          showError(`'${file.name}'은(는) 이미지 파일이 아닙니다.`);
          continue;
        }
        try {
          const result: UploadResult = await uploadImage(file, folder);
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
    } finally {
      setBatchProgress(null);
    }

    return uploaded;
  };

  return { uploadBatch, batchProgress };
}
