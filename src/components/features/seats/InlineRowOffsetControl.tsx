'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { RowOffsetValue } from '@/types/grid';

// 오프셋 범위: -2 ~ +2
const MIN_OFFSET = -2;
const MAX_OFFSET = 2;
const STEP = 0.5;

interface InlineRowOffsetControlProps {
  /** 행 번호 (1-based, UI 표시용) */
  rowNumber: number;
  /** 현재 오프셋 값 (undefined = 0) */
  currentOffset: RowOffsetValue | undefined;
  /** 오프셋 변경 콜백 */
  onChange: (offset: RowOffsetValue) => void;
  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * 좌석 그리드 내 인라인 행 오프셋 컨트롤
 *
 * Step 5(행별 Offset 조정)에서 각 행 옆에 표시되어
 * 직관적인 위치 조정을 가능하게 합니다.
 *
 * - 왼쪽 버튼(◀): 행을 왼쪽으로 0.5칸 이동
 * - 오른쪽 버튼(▶): 행을 오른쪽으로 0.5칸 이동
 */
export default function InlineRowOffsetControl({
  rowNumber,
  currentOffset,
  onChange,
  disabled = false,
}: InlineRowOffsetControlProps) {
  const current = currentOffset ?? 0;

  /**
   * 왼쪽 버튼: 행을 왼쪽으로 0.5칸 이동
   * offset 감소 → translateX 음수 → 시각적 왼쪽 이동
   */
  const handleMoveLeft = () => {
    const newValue = current - STEP;
    if (newValue >= MIN_OFFSET) {
      onChange(newValue as RowOffsetValue);
    }
  };

  /**
   * 오른쪽 버튼: 행을 오른쪽으로 0.5칸 이동
   * offset 증가 → translateX 양수 → 시각적 오른쪽 이동
   */
  const handleMoveRight = () => {
    const newValue = current + STEP;
    if (newValue <= MAX_OFFSET) {
      onChange(newValue as RowOffsetValue);
    }
  };

  // 경계값 도달 여부 (왼쪽 버튼은 offset 감소, 오른쪽 버튼은 offset 증가)
  const atLeftLimit = current <= MIN_OFFSET;
  const atRightLimit = current >= MAX_OFFSET;

  return (
    <div className="flex items-center gap-0.5" data-capture-ignore>
      {/* 왼쪽 버튼: 행을 왼쪽으로 이동 */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleMoveLeft}
        disabled={disabled || atLeftLimit}
        className="h-10 w-10 touch-manipulation p-0 text-[var(--color-text-secondary)] transition-transform hover:bg-[var(--color-primary-100)] active:scale-95 disabled:opacity-30 sm:h-8 sm:w-8"
        aria-label={`${rowNumber}줄 왼쪽으로 이동`}
      >
        <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" />
      </Button>

      {/* 오른쪽 버튼: 행을 오른쪽으로 이동 */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleMoveRight}
        disabled={disabled || atRightLimit}
        className="h-10 w-10 touch-manipulation p-0 text-[var(--color-text-secondary)] transition-transform hover:bg-[var(--color-primary-100)] active:scale-95 disabled:opacity-30 sm:h-8 sm:w-8"
        aria-label={`${rowNumber}줄 오른쪽으로 이동`}
      >
        <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" />
      </Button>
    </div>
  );
}
