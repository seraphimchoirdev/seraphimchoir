'use client';

import { use } from 'react';

import NoticeDetail from '@/components/features/community/notices/NoticeDetail';

export default function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <NoticeDetail id={id} />;
}
