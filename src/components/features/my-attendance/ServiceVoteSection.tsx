'use client';

import { CheckCircle, XCircle } from 'lucide-react';

import { VoteButton } from './VoteButton';

interface ServiceVoteSectionProps {
  /** 현재 등단 가능 여부 (null = 아직 투표 안 함) */
  isAvailable: boolean | null;
  onVote: (value: boolean) => void;
  disabled?: boolean;
}

export function ServiceVoteSection({
  isAvailable,
  onVote,
  disabled = false,
}: ServiceVoteSectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
        예배 등단
      </h3>
      <div className="flex gap-3">
        <div className="flex-1">
          <VoteButton
            selected={isAvailable === true}
            icon={<CheckCircle className="h-5 w-5" />}
            label="가능"
            onClick={() => onVote(true)}
            disabled={disabled}
            colorScheme="green"
          />
        </div>
        <div className="flex-1">
          <VoteButton
            selected={isAvailable === false}
            icon={<XCircle className="h-5 w-5" />}
            label="불가"
            onClick={() => onVote(false)}
            disabled={disabled}
            colorScheme="red"
          />
        </div>
      </div>
    </div>
  );
}
