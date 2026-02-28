'use client';

import { CheckCircle, LogIn, LogOut, XCircle } from 'lucide-react';

import { PracticeAttendanceType } from '@/types/database.types';

import { VoteButton } from './VoteButton';

const PRACTICE_OPTIONS: {
  value: PracticeAttendanceType;
  label: string;
  icon: React.ReactNode;
  colorScheme: 'green' | 'red' | 'amber' | 'blue';
}[] = [
  {
    value: 'FULL',
    label: '전체참석',
    icon: <CheckCircle className="h-5 w-5" />,
    colorScheme: 'green',
  },
  {
    value: 'EARLY_LEAVE',
    label: '앞부분만',
    icon: <LogOut className="h-5 w-5" />,
    colorScheme: 'amber',
  },
  {
    value: 'LATE_JOIN',
    label: '뒷부분만',
    icon: <LogIn className="h-5 w-5" />,
    colorScheme: 'blue',
  },
  {
    value: 'ABSENT',
    label: '불참',
    icon: <XCircle className="h-5 w-5" />,
    colorScheme: 'red',
  },
];

interface PracticeVoteSectionProps {
  /** 현재 선택된 연습 참석 상태 */
  currentStatus: PracticeAttendanceType | null;
  /** is_practice_attended (practice_status가 null일 때 폴백용) */
  isPracticeAttended: boolean;
  onVote: (status: PracticeAttendanceType) => void;
  disabled?: boolean;
}

export function PracticeVoteSection({
  currentStatus,
  isPracticeAttended,
  onVote,
  disabled = false,
}: PracticeVoteSectionProps) {
  const isSelected = (value: PracticeAttendanceType) => {
    if (currentStatus !== null) return currentStatus === value;
    // practice_status가 null인 legacy 데이터 대응
    if (value === 'ABSENT') return !isPracticeAttended;
    if (value === 'FULL') return isPracticeAttended;
    return false;
  };

  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
        연습 참석
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {PRACTICE_OPTIONS.map((option) => (
          <VoteButton
            key={option.value}
            selected={isSelected(option.value)}
            icon={option.icon}
            label={option.label}
            onClick={() => onVote(option.value)}
            disabled={disabled}
            colorScheme={option.colorScheme}
          />
        ))}
      </div>
    </div>
  );
}
