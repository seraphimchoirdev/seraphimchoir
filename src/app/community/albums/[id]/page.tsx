'use client';

import { use } from 'react';

import AlbumDetail from '@/components/features/community/albums/AlbumDetail';

export default function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AlbumDetail albumId={id} />;
}
