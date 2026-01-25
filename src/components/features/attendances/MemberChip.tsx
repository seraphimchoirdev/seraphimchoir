'use client';

import { Part } from '@/types';
import { Check, Star, X } from 'lucide-react';

import { memo } from 'react';

import { cn } from '@/lib/utils';

interface MemberChipProps {
  member: {
    id: string;
    name: string;
    part: Part;
    is_leader: boolean;
  };
  isAttending: boolean;
  isChanged?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

/**
 * 컴팩트한 칩 형태의 대원 출석 토글 버튼
 * - 한 줄에 여러 명을 배치할 수 있는 작은 크기
 * - 터치/클릭으로 출석 상태 토글
 */
function MemberChip({ member, isAttending, isChanged, disabled, onToggle }: MemberChipProps) {
  // 파트별 좌측 테두리 색상 (악보 스티커 색상 기준)
  const partBorderColors: Record<Part, string> = {
    SOPRANO: 'border-l-[var(--color-part-soprano-500)]',
    ALTO: 'border-l-[var(--color-part-alto-500)]',
    TENOR: 'border-l-[var(--color-part-tenor-500)]',
    BASS: 'border-l-[var(--color-part-bass-500)]',
    SPECIAL: 'border-l-[var(--color-part-special-500)]',
  };

  const handleClick = () => {
    if (!disabled) {
      onToggle();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        // 기본 칩 스타일 - 모바일 3열 레이아웃 + 가독성 균형
        'inline-flex items-center gap-1.5 px-2 py-1.5',
        'rounded-lg border-l-4 text-[15px] font-medium',
        'transition-all duration-150 ease-out',
        'focus:ring-2 focus:ring-offset-1 focus:outline-none',
        // 파트별 좌측 테두리
        partBorderColors[member.part],
        // 출석 상태별 스타일
        isAttending
          ? [
              'border border-[var(--color-success-200)] bg-[var(--color-success-50)]',
              'text-[var(--color-success-700)]',
              !disabled && 'hover:bg-[var(--color-success-100)]',
              'focus:ring-[var(--color-success-300)]',
            ]
          : [
              'border border-[var(--color-border-default)] bg-[var(--color-background-tertiary)]',
              'text-[var(--color-text-tertiary)]',
              !disabled && 'hover:bg-[var(--color-background-secondary)]',
              'focus:ring-[var(--color-border-default)]',
            ],
        // 변경됨 표시
        isChanged && 'ring-2 ring-[var(--color-primary-300)] ring-offset-1',
        // 비활성화 상태
        disabled && 'cursor-not-allowed opacity-60'
      )}
      aria-pressed={isAttending}
      aria-disabled={disabled}
      aria-label={`${member.name} ${isAttending ? '출석' : '불참'}${disabled ? ' (수정 불가)' : '. 탭하여 변경'}`}
    >
      {/* 상태 아이콘 */}
      {isAttending ? (
        <Check className="h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <X className="h-3.5 w-3.5 flex-shrink-0" />
      )}

      {/* 이름 */}
      <span className="max-w-[70px] truncate">{member.name}</span>

      {/* 리더 표시 */}
      {member.is_leader && (
        <Star className="h-3 w-3 flex-shrink-0 fill-[var(--color-warning-500)] text-[var(--color-warning-500)]" />
      )}
    </button>
  );
}

export default memo(MemberChip);
