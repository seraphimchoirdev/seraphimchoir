'use client';

import { use } from 'react';

import AlbumForm from '@/components/features/community/albums/AlbumForm';

export default function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AlbumForm editId={id} />;
}
