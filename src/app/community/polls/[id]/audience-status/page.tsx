'use client';

import { use } from 'react';

import PollAudienceStatus from '@/components/features/community/polls/PollAudienceStatus';

export default function PollAudienceStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PollAudienceStatus pollId={id} />;
}
