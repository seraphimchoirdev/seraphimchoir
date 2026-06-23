'use client';

import { Calendar, Image as ImageIcon, Sparkles } from 'lucide-react';

import Link from 'next/link';

import { isAutoAlbum } from '@/lib/community/album-constants';
import type { AlbumWithMeta } from '@/types/community';

interface AlbumCardProps {
  album: AlbumWithMeta;
}

function formatEventDate(date: string): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function AlbumCard({ album }: AlbumCardProps) {
  const auto = isAutoAlbum(album.description);

  return (
    <Link
      href={`/community/albums/${album.id}`}
      className="group block overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] transition-all hover:shadow-md active:scale-[0.98]"
    >
      {/* 커버 이미지 */}
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--color-background-tertiary)]">
        {album.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={album.cover_url}
            alt={album.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--color-text-tertiary)]">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}

        {/* 자동 앨범 뱃지 */}
        {auto && (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-600)]/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            자동
          </div>
        )}

        {/* 사진 개수 배지 */}
        <div className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {album.photo_count ?? 0}장
        </div>
      </div>

      {/* 메타 */}
      <div className="p-3">
        <h3 className="line-clamp-1 text-base font-semibold text-[var(--color-text-primary)]">
          {album.title}
        </h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
          <Calendar className="h-3.5 w-3.5" />
          {formatEventDate(album.event_date)}
        </div>
      </div>
    </Link>
  );
}
