'use client';

import { use } from 'react';

import ConfirmationStatus from '@/components/features/community/notices/ConfirmationStatus';

export default function ConfirmationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ConfirmationStatus postId={id} />;
}
