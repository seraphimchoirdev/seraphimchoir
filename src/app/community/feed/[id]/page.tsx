'use client';

import { use } from 'react';

import FeedDetail from '@/components/features/community/feed/FeedDetail';

export default function FeedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <FeedDetail id={id} />;
}
