'use client';

import { BarChart3, CheckCircle2, Clock, Lock, Users } from 'lucide-react';

import Link from 'next/link';

import TimeAgo from '@/components/features/community/common/TimeAgo';

import {
  formatTargetParts,
  POLL_AUDIENCE_LABELS,
  POLL_TYPE_LABELS,
} from '@/lib/community/poll-constants';

import type { PollWithMeta } from '@/types/community';

interface PollCardProps {
  poll: PollWithMeta;
}

function formatDeadline(deadlineAt: string): string {
  const d = new Date(deadlineAt);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function PollCard({ poll }: PollCardProps) {
  const audienceLabel =
    poll.audience_type === 'PART'
      ? formatTargetParts(poll.target_parts)
      : POLL_AUDIENCE_LABELS[poll.audience_type] || poll.audience_type;

  return (
    <Link
      href={`/community/polls/${poll.id}`}
      className="block rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-5 transition-colors hover:bg-[var(--color-background-secondary)]"
    >
      {/* 상단: 배지들 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-[var(--color-primary-50)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary-700)]">
          {POLL_TYPE_LABELS[poll.poll_type] || poll.poll_type}
        </span>
        <span className="rounded-full bg-[var(--color-background-tertiary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
          {audienceLabel}
        </span>
        {poll.is_anonymous && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-background-tertiary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
            <Lock className="h-3 w-3" />
            익명
          </span>
        )}
        {poll.is_effectively_closed ? (
          <span className="ml-auto rounded-full bg-[var(--color-background-tertiary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-tertiary)]">
            마감
          </span>
        ) : (
          poll.has_my_response && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[var(--color-success-600)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              투표 완료
            </span>
          )
        )}
      </div>

      {/* 제목 */}
      <h3 className="mt-2.5 text-base font-semibold text-[var(--color-text-primary)] line-clamp-2">
        {poll.title}
      </h3>

      {/* 하단: 작성자 · 응답 수 · 마감 시각 */}
      <div className="mt-3 flex items-center gap-3 text-sm text-[var(--color-text-tertiary)]">
        {poll.creator && <span>{poll.creator.name}</span>}
        <TimeAgo date={poll.created_at ?? ''} />
        <span className="inline-flex items-center gap-1">
          <Users className="h-4 w-4" />
          {poll.voter_count}명 참여
        </span>
        {poll.deadline_at && !poll.is_effectively_closed && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDeadline(poll.deadline_at)} 마감
          </span>
        )}
      </div>
    </Link>
  );
}

/** 목록이 비었을 때 */
export function PollEmptyState({ status }: { status: 'active' | 'closed' }) {
  return (
    <div className="py-12 text-center">
      <BarChart3 className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
      <p className="text-base text-[var(--color-text-secondary)]">
        {status === 'active'
          ? '진행 중인 설문이 없습니다.'
          : '마감된 설문이 없습니다.'}
      </p>
    </div>
  );
}
