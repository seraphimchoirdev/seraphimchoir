'use client';

import {
  ChevronLeft,
  ChevronRight,
  Download,
  MessageCircle,
  Trash2,
  X,
} from 'lucide-react';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Spinner } from '@/components/ui/spinner';

import { useDeleteAlbumPhoto } from '@/hooks/useAlbums';
import { useAuth } from '@/hooks/useAuth';
import { showError, showSuccess } from '@/lib/toast';

import type { AlbumPhotoWithUploader } from '@/types/community';

import PhotoCommentSheet from './PhotoCommentSheet';
import PhotoReactionBar from './PhotoReactionBar';

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
  const [showComments, setShowComments] = useState(false);
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

  const handleDownload = () => {
    if (!current) return;
    // 프록시 라우트를 통해 Content-Disposition: attachment로 다운로드
    const link = document.createElement('a');
    link.href = `/api/community/albums/${albumId}/photos/${current.id}/download`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/95"
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

          {/* 하단 액션 바 + 정보 */}
          <div
            className="absolute right-0 bottom-0 left-0 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* row 1: 반응 + 다운로드 + 댓글 + 삭제 */}
            <div className="flex items-center gap-2">
              <PhotoReactionBar
                albumId={albumId}
                photoId={current.id}
                myReaction={current.my_reaction}
                reactionCounts={current.reaction_counts}
              />

              {/* spacer: 반응(좌) ↔ 액션 버튼(우) 양끝 정렬 */}
              <div className="flex-1" />

              <button
                onClick={handleDownload}
                className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/20"
                aria-label="사진 다운로드"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">저장</span>
              </button>

              <button
                onClick={() => setShowComments(true)}
                className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/20"
                aria-label="댓글"
              >
                <MessageCircle className="h-4 w-4" />
                {current.comment_count > 0 && (
                  <span className="text-xs tabular-nums">
                    {current.comment_count}
                  </span>
                )}
              </button>

              {canDeleteCurrent && (
                <button
                  onClick={handleDelete}
                  disabled={deletePhoto.isPending}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-error-500)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-error-600)] disabled:opacity-50"
                  aria-label="사진 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">삭제</span>
                </button>
              )}
            </div>

            {/* row 2: 캡션 + 업로더 */}
            {(current.caption || current.uploader) && (
              <div className="min-w-0">
                {current.caption && (
                  <p className="line-clamp-2 text-sm">{current.caption}</p>
                )}
                {current.uploader && (
                  <p className="mt-0.5 text-xs text-white/70">
                    업로더: {current.uploader.name}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 사진 댓글 시트 (라이트박스와 독립적으로 제어) */}
      {current && (
        <PhotoCommentSheet
          albumId={albumId}
          photoId={current.id}
          open={showComments}
          onOpenChange={setShowComments}
        />
      )}
    </>
  );
}
