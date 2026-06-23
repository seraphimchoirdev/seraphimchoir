'use client';

import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Spinner } from '@/components/ui/spinner';

import { useDeleteAlbumPhoto } from '@/hooks/useAlbums';
import { useAuth } from '@/hooks/useAuth';
import { showError, showSuccess } from '@/lib/toast';

import type { AlbumPhotoWithUploader } from '@/types/community';

interface PhotoGridProps {
  albumId: string;
  photos: AlbumPhotoWithUploader[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  /** 앨범 작성자 또는 매니저만 모든 사진 삭제 가능 */
  canManageAlbum?: boolean;
}

export default function PhotoGrid({
  albumId,
  photos,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  canManageAlbum = false,
}: PhotoGridProps) {
  const { profile } = useAuth();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const deletePhoto = useDeleteAlbumPhoto(albumId);

  // 무한 스크롤
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  const closeLightbox = useCallback(() => setOpenIndex(null), []);
  const goPrev = useCallback(
    () => setOpenIndex((i) => (i === null ? null : Math.max(0, i - 1))),
    []
  );
  const goNext = useCallback(
    () =>
      setOpenIndex((i) =>
        i === null ? null : Math.min(photos.length - 1, i + 1)
      ),
    [photos.length]
  );

  // 키보드 네비게이션
  useEffect(() => {
    if (openIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openIndex, closeLightbox, goPrev, goNext]);

  const current = openIndex !== null ? photos[openIndex] : null;

  const canDeleteCurrent = useMemo(() => {
    if (!current || !profile) return false;
    if (canManageAlbum) return true;
    if (profile.role === 'ADMIN') return true;
    return current.uploader?.id === profile.id;
  }, [current, profile, canManageAlbum]);

  const handleDelete = async () => {
    if (!current) return;
    if (!confirm('이 사진을 삭제할까요?')) return;
    try {
      await deletePhoto.mutateAsync(current.id);
      showSuccess('사진이 삭제되었습니다.');
      // 마지막 사진을 삭제한 경우 라이트박스 닫기
      if (photos.length <= 1) {
        closeLightbox();
      } else if (openIndex === photos.length - 1) {
        setOpenIndex(openIndex - 1);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  return (
    <>
      {/* 그리드 */}
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2">
        {photos.map((photo, idx) => (
          <button
            key={photo.id}
            onClick={() => setOpenIndex(idx)}
            className="relative aspect-square overflow-hidden rounded-md bg-[var(--color-background-tertiary)] transition-opacity hover:opacity-90"
            aria-label={`사진 ${idx + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbnail_path || photo.file_path}
              alt={photo.caption || `사진 ${idx + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* 무한 스크롤 트리거 */}
      <div ref={loadMoreRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <Spinner size="default" />
        </div>
      )}

      {/* 라이트박스 */}
      {current && openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={closeLightbox}
        >
          {/* 닫기 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>

          {/* 카운터 */}
          <div className="absolute top-4 left-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
            {openIndex + 1} / {photos.length}
          </div>

          {/* 이전 */}
          {openIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:left-4"
              aria-label="이전 사진"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          )}

          {/* 다음 */}
          {openIndex < photos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-4"
              aria-label="다음 사진"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          )}

          {/* 이미지 */}
          <div
            className="flex max-h-[90vh] max-w-[95vw] items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.file_path}
              alt={current.caption || '사진'}
              className="max-h-[90vh] max-w-[95vw] object-contain"
            />
          </div>

          {/* 하단 정보 + 삭제 */}
          <div
            className="absolute right-0 bottom-0 left-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 py-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex-1">
              {current.caption && (
                <p className="line-clamp-2 text-sm">{current.caption}</p>
              )}
              {current.uploader && (
                <p className="mt-0.5 text-xs text-white/70">
                  업로더: {current.uploader.name}
                </p>
              )}
            </div>
            {canDeleteCurrent && (
              <button
                onClick={handleDelete}
                disabled={deletePhoto.isPending}
                className="flex shrink-0 items-center gap-1 rounded-md bg-[var(--color-error-500)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-error-600)] disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
