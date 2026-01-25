'use client';

import { CheckCircle2, GripVertical } from 'lucide-react';

import { memo } from 'react';

import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

import { useArrangementStore } from '@/store/arrangement-store';

import type { Database } from '@/types/database.types';

type Part = Database['public']['Enums']['part'];

interface ClickableMemberProps {
  memberId: string;
  name: string;
  part: Part;
  isPlaced?: boolean;
}

function ClickableMember({ memberId, name, part, isPlaced }: ClickableMemberProps) {
  const { selectedMemberId, selectedSource, selectMemberFromSidebar } = useArrangementStore();

  // Check if this member is currently selected
  const isSelected = selectedMemberId === memberId && selectedSource === 'sidebar';

  // Part color mapping - 악보 스티커 색상 기준 (CSS 변수 사용)
  const getPartColor = (p: Part) => {
    switch (p) {
      case 'SOPRANO':
        return 'bg-[var(--color-part-soprano-600)] text-white border-[var(--color-part-soprano-700)]';
      case 'ALTO':
        return 'bg-[var(--color-part-alto-500)] text-white border-[var(--color-part-alto-600)]';
      case 'TENOR':
        return 'bg-[var(--color-part-tenor-600)] text-white border-[var(--color-part-tenor-700)]';
      case 'BASS':
        return 'bg-[var(--color-part-bass-600)] text-white border-[var(--color-part-bass-700)]';
      default:
        return 'bg-[var(--color-part-special-500)] text-white border-[var(--color-part-special-600)]';
    }
  };

  const handleClick = () => {
    if (!isPlaced) {
      selectMemberFromSidebar(memberId, name, part);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPlaced}
      className={cn(
        'mb-1.5 flex min-h-[40px] w-full items-center justify-between rounded-md p-2 shadow-sm',
        'touch-manipulation transition-all duration-200',
        'relative',
        // Normal state
        !isPlaced &&
          !isSelected &&
          'border border-[var(--color-border-default)] bg-[var(--color-background-primary)] hover:border-[var(--color-primary-400)] hover:shadow-md active:scale-[0.98]',
        // Selected state
        isSelected &&
          'border-2 border-[var(--color-primary-500)] bg-[var(--color-primary-50)] ring-2 ring-[var(--color-primary-200)]',
        // Disabled state
        isPlaced &&
          'cursor-not-allowed border border-[var(--color-border-default)] bg-[var(--color-background-secondary)] opacity-50'
      )}
      aria-label={`${name} - ${part} 파트 ${isPlaced ? '(이미 배치됨)' : isSelected ? '(선택됨)' : '클릭하여 선택'}`}
      aria-pressed={isSelected}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isSelected ? (
          <CheckCircle2 className="animate-in fade-in zoom-in h-4 w-4 flex-shrink-0 text-[var(--color-primary-600)] duration-200" />
        ) : (
          <GripVertical className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
        )}
        <span className="truncate text-sm font-medium">{name}</span>
      </div>
      <Badge
        variant="outline"
        className={`px-1.5 py-0.5 text-[10px] sm:text-xs ${getPartColor(part)} ml-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full p-0`}
      >
        {part === 'SPECIAL' ? 'Sp' : part.charAt(0)}
      </Badge>
    </button>
  );
}

export default memo(ClickableMember);
