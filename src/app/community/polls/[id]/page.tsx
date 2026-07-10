'use client';

import { use } from 'react';

import PollDetailView from '@/components/features/community/polls/PollDetailView';

export default function PollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PollDetailView pollId={id} />;
}
