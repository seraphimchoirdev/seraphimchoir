'use client';

import { memo } from 'react';
import { cn, getPartAbbreviation, getPartColor } from '@/lib/utils';
import { CheckCircle, XCircle, Star } from 'lucide-react';
import { Part } from '@/types';

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
        "w-full flex items-center justify-between px-4 py-3",
        "min-h-[60px] rounded-lg transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-400)]",
        // 출석 상태별 스타일
        isAttending
          ? "bg-[var(--color-success-100)] border border-[var(--color-success-300)] hover:bg-[var(--color-success-200)]"
          : "bg-[var(--color-background-tertiary)] border border-[var(--color-border-default)] hover:bg-gray-200",
        // 변경 표시
        isChanged && "ring-2 ring-[var(--color-primary-300)] ring-offset-1"
      )}
      aria-pressed={isAttending}
      aria-label={`${member.name} ${isAttending ? '출석' : '불참'} 상태. 탭하여 변경`}
    >
      {/* 좌측: 아이콘 + 이름 */}
      <div className="flex items-center gap-3">
        {isAttending ? (
          <CheckCircle className="w-5 h-5 text-[var(--color-success-600)] flex-shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-[var(--color-text-tertiary)] flex-shrink-0" />
        )}
        <span className={cn(
          "font-medium",
          isAttending ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"
        )}>
          {member.name}
        </span>
        {member.is_leader && (
          <Star className="w-4 h-4 text-[var(--color-warning-500)] fill-[var(--color-warning-500)] flex-shrink-0" />
        )}
      </div>

      {/* 우측: 파트 배지 */}
      <span className={cn(
        "text-xs font-medium px-2 py-1 rounded border",
        getPartColor(member.part)
      )}>
        {getPartAbbreviation(member.part)}
      </span>
    </button>
  );
}

export default memo(MemberRow);
