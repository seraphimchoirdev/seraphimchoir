'use client';

import { Part } from '@/types';
import { CheckCircle, Star, XCircle } from 'lucide-react';

import { memo } from 'react';

import { cn, getPartAbbreviation, getPartColor } from '@/lib/utils';

interface MemberRowProps {
  member: {
    id: string;
    name: string;
    part: Part;
    is_leader: boolean;
  };
  isAttending: boolean;
  isChanged: boolean;
  onToggle: () => void;
}

function MemberRow({ member, isAttending, isChanged, onToggle }: MemberRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        // 기본 스타일
        'flex w-full items-center justify-between px-4 py-3',
        'min-h-[60px] rounded-lg transition-all duration-200',
        'focus:ring-2 focus:ring-[var(--color-primary-400)] focus:ring-offset-2 focus:outline-none',
        // 출석 상태별 스타일
        isAttending
          ? 'border border-[var(--color-success-300)] bg-[var(--color-success-100)] hover:bg-[var(--color-success-200)]'
          : 'border border-[var(--color-border-default)] bg-[var(--color-background-tertiary)] hover:bg-gray-200',
        // 변경 표시
        isChanged && 'ring-2 ring-[var(--color-primary-300)] ring-offset-1'
      )}
      aria-pressed={isAttending}
      aria-label={`${member.name} ${isAttending ? '출석' : '불참'} 상태. 탭하여 변경`}
    >
      {/* 좌측: 아이콘 + 이름 */}
      <div className="flex items-center gap-3">
        {isAttending ? (
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-[var(--color-success-600)]" />
        ) : (
          <XCircle className="h-5 w-5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
        )}
        <span
          className={cn(
            'font-medium',
            isAttending ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'
          )}
        >
          {member.name}
        </span>
        {member.is_leader && (
          <Star className="h-4 w-4 flex-shrink-0 fill-[var(--color-warning-500)] text-[var(--color-warning-500)]" />
        )}
      </div>

      {/* 우측: 파트 배지 */}
      <span
        className={cn('rounded border px-2 py-1 text-xs font-medium', getPartColor(member.part))}
      >
        {getPartAbbreviation(member.part)}
      </span>
    </button>
  );
}

export default memo(MemberRow);
