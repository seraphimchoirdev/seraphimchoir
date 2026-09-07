'use client';

import { Check, Minus, X } from 'lucide-react';

import { memo } from 'react';

import { cn } from '@/lib/utils';

interface PracticeSetChipProps {
  /** 칩 라벨 (예: "전연습", "후연습") */
  label: string;
  /** null = 미기록. 전연습은 "확인 안 함"과 "불참"이 다른 의미다. */
  value: boolean | null;
  /** 저장 전 변경분 표시 */
  isChanged?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

/**
 * 신입대원의 연습 세트(전연습/후연습) 기록용 3상태 칩.
 *
 * MemberChip과 분리한 이유: MemberChip은 boolean 2상태이고 "대원 한 명"을 나타내는
 * 단위다. 여기에 3상태와 라벨을 옵션으로 얹으면 출석 화면 전체가 쓰는 컴포넌트가
 * 신입 전용 분기를 품게 된다. 신입 행에서만 쓰는 칩은 따로 두는 편이 안전하다.
 *
 * 미기록(null)을 시각적으로 구분하는 것이 핵심이다. 회색 빗금 하나로 "불참"과
 * "아직 확인 안 함"을 같이 표현하면 파트장이 체크를 빠뜨린 것을 발견할 수 없다.
 */
function PracticeSetChip({ label, value, isChanged, disabled, onToggle }: PracticeSetChipProps) {
  const handleClick = () => {
    if (!disabled) onToggle();
  };

  const stateLabel = value === true ? '참석' : value === false ? '불참' : '미기록';

  return (
    <button
      type="button"
      data-testid="practice-set-chip"
      data-value={value === null ? 'unset' : String(value)}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium',
        'transition-all duration-150 ease-out',
        'focus:ring-2 focus:ring-offset-1 focus:outline-none',
        value === true && [
          'border-[var(--color-success-200)] bg-[var(--color-success-50)]',
          'text-[var(--color-success-700)]',
          !disabled && 'hover:bg-[var(--color-success-100)]',
          'focus:ring-[var(--color-success-300)]',
        ],
        value === false && [
          'border-[var(--color-error-200)] bg-[var(--color-error-50)]',
          'text-[var(--color-error-700)]',
          !disabled && 'hover:bg-[var(--color-error-100)]',
          'focus:ring-[var(--color-error-300)]',
        ],
        // 미기록 — 점선 테두리로 "아직 안 채워진 칸"임을 드러낸다
        value === null && [
          'border-dashed border-[var(--color-border-default)] bg-transparent',
          'text-[var(--color-text-tertiary)]',
          !disabled && 'hover:bg-[var(--color-background-secondary)]',
          'focus:ring-[var(--color-border-default)]',
        ],
        isChanged && 'ring-2 ring-[var(--color-primary-300)] ring-offset-1',
        disabled && 'cursor-not-allowed opacity-60'
      )}
      aria-label={`${label} ${stateLabel}${disabled ? ' (수정 불가)' : '. 탭하여 변경'}`}
    >
      {value === true ? (
        <Check className="h-3 w-3 flex-shrink-0" />
      ) : value === false ? (
        <X className="h-3 w-3 flex-shrink-0" />
      ) : (
        <Minus className="h-3 w-3 flex-shrink-0" />
      )}
      <span>{label}</span>
    </button>
  );
}

export default memo(PracticeSetChip);
