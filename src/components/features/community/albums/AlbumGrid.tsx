'use client';

import { FolderPlus, Image as ImageIcon, Plus, Search, X } from 'lucide-react';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

import { useAlbums } from '@/hooks/useAlbums';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';

import AlbumCard from './AlbumCard';
import QuickPhotoUploader from './QuickPhotoUploader';

const CREATE_ROLES = [
  'ADMIN',
  'CONDUCTOR',
  'MANAGER',
  'SECRETARY',
  'TREASURER',
  'PART_LEADER',
];

export default function AlbumGrid() {
  const { profile } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [year, setYear] = useState<string>('all');
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAlbums({
      search: debouncedSearch || undefined,
      year: year === 'all' ? undefined : year,
    });

  const allAlbums = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data]
  );

  // 무한 스크롤
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 앨범 만들기는 리더 권한 필요
  const canCreateAlbum =
    profile?.role === 'ADMIN' ||
    (CREATE_ROLES.includes(profile?.role || '') &&
      !!profile?.linked_member_id &&
      profile?.link_status === 'approved');

  // 빠른 사진 업로드는 일반 대원도 가능 (linked_member 있으면 OK)
  const canQuickUpload =
    profile?.role === 'ADMIN' ||
    (!!profile?.linked_member_id && profile?.link_status === 'approved');

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value),
    []
  );

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 6 }, (_, i) => String(currentYear - i)),
    [currentYear]
  );

  return (
    <div className="space-y-4">
      {/* 검색 + 연도 필터 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <Input
            type="text"
            placeholder="앨범 제목 검색"
            value={searchInput}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-background-primary)] px-3 text-sm text-[var(--color-text-primary)]"
        >
          <option value="all">전체</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
      </div>

      {/* 빠른 업로드 진입점 (사진 탭 메인) */}
      {canQuickUpload && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-[var(--color-border-default)] bg-[var(--color-background-secondary)] px-4 py-3">
          <div className="text-sm text-[var(--color-text-secondary)]">
            앨범을 만들 필요 없이 사진을 바로 올려보세요.
          </div>
          <QuickPhotoUploader variant="primary" />
        </div>
      )}

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : allAlbums.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-[var(--color-text-tertiary)]">
          <ImageIcon className="mb-3 h-12 w-12" />
          <p className="text-base">
            {debouncedSearch || year !== 'all'
              ? '검색 결과가 없습니다.'
              : '아직 앨범이 없습니다.'}
          </p>
          {canCreateAlbum && !debouncedSearch && year === 'all' && (
            <Link
              href="/community/albums/new"
              className="mt-4 text-sm text-[var(--color-primary-600)] hover:underline"
            >
              첫 앨범을 만들어보세요 →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {allAlbums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}

      {/* 무한 스크롤 트리거 */}
      <div ref={loadMoreRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner size="default" />
        </div>
      )}

      {/* FAB + 액션시트 */}
      {canQuickUpload && (
        <>
          {/* 액션시트 배경 */}
          {fabMenuOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setFabMenuOpen(false)}
            />
          )}

          {/* 액션시트 */}
          {fabMenuOpen && (
            <div className="fixed right-4 bottom-36 z-50 w-56 overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] shadow-xl lg:bottom-24">
              {/* 빠른 업로드 (모든 대원) */}
              <div className="border-b border-[var(--color-border-default)] p-2">
                <QuickPhotoUploader
                  variant="secondary"
                  navigateAfter
                  className="w-full justify-start border-0 hover:bg-[var(--color-background-secondary)]"
                >
                  사진만 올리기
                </QuickPhotoUploader>
              </div>
              {/* 앨범 만들기 (리더만) */}
              {canCreateAlbum && (
                <Link
                  href="/community/albums/new"
                  onClick={() => setFabMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-background-secondary)]"
                >
                  <FolderPlus className="h-4 w-4" />
                  새 앨범 만들기
                </Link>
              )}
            </div>
          )}

          {/* FAB */}
          <button
            type="button"
            onClick={() => setFabMenuOpen((v) => !v)}
            className="fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-white shadow-lg transition-all active:scale-95 hover:bg-[var(--color-primary-700)] lg:bottom-6"
            aria-label={fabMenuOpen ? '메뉴 닫기' : '사진/앨범 추가'}
          >
            {fabMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Plus className="h-6 w-6" />
            )}
          </button>
        </>
      )}
    </div>
  );
}
