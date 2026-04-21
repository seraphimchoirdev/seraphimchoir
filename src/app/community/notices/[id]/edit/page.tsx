'use client';

import { use } from 'react';

import NoticeForm from '@/components/features/community/notices/NoticeForm';

export default function EditNoticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <NoticeForm editId={id} />;
}
