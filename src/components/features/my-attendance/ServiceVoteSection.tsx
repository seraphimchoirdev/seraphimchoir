'use client';

import { CheckCircle, Clock, XCircle } from 'lucide-react';

import { VoteButton } from './VoteButton';

export interface DeadlineInfo {
  /** "토요일 15:00" 형태 */
  display: string;
  /** "2일 남음" 형태 */
  timeLeft: string;
  /** 마감 여부 */
  isPassed: boolean;
  /** 1시간 미만 임박 여부 */
  isUrgent: boolean;
}

interface ServiceVoteSectionProps {
  /** 현재 등단 가능 여부 (null = 아직 투표 안 함) */
  isAvailable: boolean | null;
  onVote: (value: boolean) => void;
  disabled?: boolean;
  deadline?: DeadlineInfo | null;
}

export function ServiceVoteSection({
  isAvailable,
  onVote,
  disabled = false,
  deadline,
}: ServiceVoteSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
          예배 등단
        </h3>
        {deadline && <DeadlineLabel deadline={deadline} />}
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <VoteButton
            selected={isAvailable === true}
            icon={<CheckCircle className="h-5 w-5" />}
            label="가능"
            onClick={() => onVote(true)}
            disabled={disabled || (deadline?.isPassed ?? false)}
            colorScheme="green"
          />
        </div>
        <div className="flex-1">
          <VoteButton
            selected={isAvailable === false}
            icon={<XCircle className="h-5 w-5" />}
            label="불가"
            onClick={() => onVote(false)}
            disabled={disabled || (deadline?.isPassed ?? false)}
            colorScheme="red"
          />
        </div>
      </div>
    </div>
  );
}

function DeadlineLabel({ deadline }: { deadline: DeadlineInfo }) {
  if (deadline.isPassed) {
    return (
      <span className="flex items-center gap-1 text-xs text-[var(--color-text-disabled)]">
        <Clock className="h-3.5 w-3.5" />
        마감됨
      </span>
    );
  }

  const colorClass = deadline.isUrgent
    ? 'text-amber-500'
    : 'text-[var(--color-text-tertiary)]';

  return (
    <span className={`flex items-center gap-1 text-xs ${colorClass}`}>
      <Clock className="h-3.5 w-3.5" />
      {deadline.display} · {deadline.timeLeft}
    </span>
  );
}
