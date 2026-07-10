'use client';

import JSZip from 'jszip';

import { useState } from 'react';

import { ALBUM_DOWNLOAD_MAX_PHOTOS } from '@/lib/community/album-constants';
import { showError, showSuccess } from '@/lib/toast';

interface DownloadablePhoto {
  id: string;
  file_path: string | null;
}

/**
 * 앨범의 전체 사진 목록을 조회한다.
 * 화면의 useAlbumPhotos는 무한 스크롤이라 로드된 페이지만 갖고 있으므로
 * 다운로드용으로는 상한(limit)까지 한 번에 가져온다.
 */
async function fetchAllPhotos(
  albumId: string
): Promise<{ photos: DownloadablePhoto[]; hasMore: boolean }> {
  const res = await fetch(
    `/api/community/albums/${albumId}/photos?limit=${ALBUM_DOWNLOAD_MAX_PHOTOS}`
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '사진 목록을 불러오지 못했습니다.');
  }
  const json = await res.json();
  return { photos: json.data ?? [], hasMore: Boolean(json.hasMore) };
}

/** zip 파일명에 쓸 수 없는 문자 제거 */
function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'album';
}

/**
 * 앨범 사진 전체(일괄) 다운로드 훅.
 * 기존 개별 다운로드 프록시(/photos/[photoId]/download)를 사진별로 받아
 * 클라이언트(JSZip)에서 zip으로 묶는다 — 인증·IDOR 방지 로직을 그대로 재사용하고
 * 서버 zip 스트리밍(Vercel 실행시간 제약)을 피한다.
 */
export function useAlbumZipDownload() {
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const downloadAll = async (albumId: string, albumTitle: string) => {
    setProgress({ current: 0, total: 0 });

    let photos: DownloadablePhoto[];
    try {
      const result = await fetchAllPhotos(albumId);
      if (result.hasMore) {
        showError(
          `사진이 ${ALBUM_DOWNLOAD_MAX_PHOTOS}장을 넘는 앨범은 전체 다운로드를 지원하지 않습니다.`
        );
        return;
      }
      photos = result.photos;
    } catch (err) {
      showError(
        err instanceof Error ? err.message : '사진 목록을 불러오지 못했습니다.'
      );
      return;
    } finally {
      setProgress(null);
    }

    if (photos.length === 0) {
      showError('다운로드할 사진이 없습니다.');
      return;
    }

    setProgress({ current: 0, total: photos.length });

    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();
      let succeeded = 0;

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
          const res = await fetch(
            `/api/community/albums/${albumId}/photos/${photo.id}/download`
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();

          // 파일명: 저장 경로의 마지막 세그먼트, 충돌 시 인덱스 접두사
          let name = decodeURIComponent(
            (photo.file_path || '').split('/').pop() || `photo-${i + 1}.jpg`
          );
          if (usedNames.has(name)) name = `${i + 1}_${name}`;
          usedNames.add(name);

          zip.file(name, blob);
          succeeded++;
        } catch {
          // 개별 사진 실패(파일 유실 등)는 건너뛰고 계속 진행
        }
        setProgress({ current: i + 1, total: photos.length });
      }

      if (succeeded === 0) {
        showError('다운로드할 수 있는 사진이 없습니다.');
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitizeFileName(albumTitle)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (succeeded < photos.length) {
        showSuccess(
          `사진 ${succeeded}장을 다운로드했습니다. (${photos.length - succeeded}장은 파일을 찾지 못해 제외)`
        );
      } else {
        showSuccess(`사진 ${succeeded}장을 다운로드했습니다.`);
      }
    } finally {
      setProgress(null);
    }
  };

  return { downloadAll, progress };
}
