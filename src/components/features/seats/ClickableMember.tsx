'use client';

import { memo } from 'react';

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

// 파트별 파스텔 배경색 (GridClickableMember와 동일 팔레트)
const getPartColor = (p: Part) => {
  switch (p) {
    case 'SOPRANO':
      return 'bg-[var(--color-part-soprano-200)] border-[var(--color-part-soprano-500)]';
    case 'ALTO':
      return 'bg-[var(--color-part-alto-200)] border-[var(--color-part-alto-500)]';
    case 'TENOR':
      return 'bg-[var(--color-part-tenor-200)] border-[var(--color-part-tenor-500)]';
    case 'BASS':
      return 'bg-[var(--color-part-bass-200)] border-[var(--color-part-bass-500)]';
    default:
      return 'bg-[var(--color-part-special-200)] border-[var(--color-part-special-500)]';
  }
};

function ClickableMember({ memberId, name, part, isPlaced }: ClickableMemberProps) {
  const { selectedMemberId, selectedSource, selectMemberFromSidebar } = useArrangementStore();

  const isSelected = selectedMemberId === memberId && selectedSource === 'sidebar';

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
        'rounded-md border px-3 py-2 text-sm font-medium',
        'touch-manipulation transition-all duration-150',
        'text-[var(--color-text-primary)]',
        getPartColor(part),
        // 선택 상태
        isSelected && 'ring-2 ring-[var(--color-primary-400)] scale-105',
        // 배치됨 (hidePlaced=false일 때만 표시)
        isPlaced && 'opacity-40 line-through cursor-not-allowed',
        // 기본 호버
        !isPlaced && !isSelected && 'hover:shadow-sm hover:brightness-95 active:scale-[0.97]'
      )}
      aria-label={`${name} - ${part} 파트 ${isPlaced ? '(이미 배치됨)' : isSelected ? '(선택됨)' : '클릭하여 선택'}`}
      aria-pressed={isSelected}
    >
      {name}
    </button>
  );
}

export default memo(ClickableMember);
