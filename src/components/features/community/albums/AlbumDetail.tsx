'use client';

import { ArrowLeft, Calendar, MoreVertical, Pencil, Trash2 } from 'lucide-react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Spinner } from '@/components/ui/spinner';

import {
  useAlbum,
  useAlbumPhotos,
  useDeleteAlbum,
} from '@/hooks/useAlbums';
import { canParticipateInCommunity } from '@/lib/community/album-constants';
import { useAuth } from '@/hooks/useAuth';
import { showError, showSuccess } from '@/lib/toast';

import PhotoGrid from './PhotoGrid';
import PhotoUploader from './PhotoUploader';

interface AlbumDetailProps {
  albumId: string;
}

const MANAGER_ROLES = ['ADMIN', 'CONDUCTOR', 'MANAGER'];

function formatEventDate(date: string): string {
  const d = new Date(date);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function AlbumDetail({ albumId }: AlbumDetailProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: album, isLoading: albumLoading, error } = useAlbum(albumId);
  const {
    data: photosData,
    isLoading: photosLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAlbumPhotos(albumId);
  const deleteAlbum = useDeleteAlbum();

  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const photos = useMemo(
    () => photosData?.pages.flatMap((p) => p.data) ?? [],
    [photosData]
  );

  const canManageAlbum = useMemo(() => {
    if (!album || !profile) return false;
    if (profile.role && MANAGER_ROLES.includes(profile.role)) return true;
    return album.created_by === profile.id;
  }, [album, profile]);

  // 사진 업로드: API·RLS와 같은 판정 함수를 공유해 UI만 다르게 판단하는 일이 없게 한다
  const canUpload = !!profile && canParticipateInCommunity(profile);

  const handleDelete = async () => {
    try {
      await deleteAlbum.mutateAsync(albumId);
      showSuccess('앨범이 삭제되었습니다.');
      router.push('/community/albums');
    } catch (err) {
      showError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  if (albumLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="py-12 text-center text-[var(--color-text-tertiary)]">
        앨범을 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/community/albums')}
          aria-label="목록으로"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {canManageAlbum && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMenu((v) => !v)}
              aria-label="메뉴"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-lg border border-[var(--color-border-default)] bg-[var(--color-background-primary)] shadow-lg">
                  <Link
                    href={`/community/albums/${albumId}/edit`}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-background-secondary)]"
                    onClick={() => setShowMenu(false)}
                  >
                    <Pencil className="h-4 w-4" />
                    수정
                  </Link>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-error-600)] hover:bg-[var(--color-background-secondary)]"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 앨범 정보 */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {album.title}
        </h1>
        <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-tertiary)]">
          <Calendar className="h-4 w-4" />
          {formatEventDate(album.event_date)}
        </div>
        {album.description && (
          <p className="whitespace-pre-wrap text-base text-[var(--color-text-secondary)]">
            {album.description}
          </p>
        )}
        <div className="flex items-center gap-3 pt-1 text-xs text-[var(--color-text-tertiary)]">
          {album.creator && <span>{album.creator.name}</span>}
          <span>·</span>
          <span>사진 {album.photo_count ?? 0}장</span>
        </div>
      </div>

      {/* 사진 추가 버튼 */}
      {canUpload && (
        <div className="flex justify-end">
          <PhotoUploader albumId={albumId} />
        </div>
      )}

      {/* 사진 그리드 */}
      {photosLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="default" />
        </div>
      ) : photos.length === 0 ? (
        <div className="py-12 text-center text-[var(--color-text-tertiary)]">
          아직 사진이 없습니다.
          {canUpload && (
            <p className="mt-2 text-sm">위 버튼으로 사진을 추가해주세요.</p>
          )}
        </div>
      ) : (
        <PhotoGrid
          albumId={albumId}
          photos={photos}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          canManageAlbum={canManageAlbum}
        />
      )}

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="앨범 삭제"
        description="앨범을 삭제하면 모든 사진도 함께 삭제됩니다. 정말 삭제하시겠습니까?"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
