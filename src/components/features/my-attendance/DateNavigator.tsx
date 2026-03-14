'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface DateNavigatorProps {
  selectedDate: string;
  relativeLabel: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function DateNavigator({
  selectedDate,
  relativeLabel,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: DateNavigatorProps) {
  const formatted = new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="flex items-center justify-between px-2">
      {/* 이전 버튼 */}
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
          hasPrev
            ? 'text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] active:scale-95'
            : 'opacity-30 pointer-events-none'
        )}
        aria-label="이전 예배 날짜"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      {/* 날짜 표시 */}
      <div className="text-center">
        <p className="text-lg font-bold text-[var(--color-text-primary)]">{formatted}</p>
        {relativeLabel && (
          <p className="text-sm font-medium text-[var(--color-primary-600)]">
            {relativeLabel}
          </p>
        )}
      </div>

      {/* 다음 버튼 */}
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
          hasNext
            ? 'text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] active:scale-95'
            : 'opacity-30 pointer-events-none'
        )}
        aria-label="다음 예배 날짜"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}
