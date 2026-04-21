'use client';

import { use } from 'react';

import PostForm from '@/components/features/community/feed/PostForm';

export default function EditFeedPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PostForm editId={id} />;
}
