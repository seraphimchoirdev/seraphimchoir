'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RowOffsetValue } from '@/types/grid';

/**
 * 오프셋 값 배열 (순환용)
 * null은 "기본 패턴"을 의미하며 UI에서 별도 처리
 */
const OFFSET_VALUES: RowOffsetValue[] = [0, 0.25, 0.5, 0.75];

interface InlineRowOffsetControlProps {
  /** 행 번호 (1-based, UI 표시용) */
  rowNumber: number;
  /** 현재 오프셋 값 (undefined = 기본 패턴) */
  currentOffset: RowOffsetValue | undefined;
  /** 오프셋 변경 콜백 */
  onChange: (offset: RowOffsetValue) => void;
  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * 좌석 그리드 내 인라인 행 오프셋 컨트롤
 *
 * Step 5(행별 Offset 조정)에서 각 행 양쪽에 표시되어
 * 직관적인 위치 조정을 가능하게 합니다.
 *
 * ```
 * [◀] [좌석1] [좌석2] ... [좌석N] [▶]
 * ```
 */
export default function InlineRowOffsetControl({
  rowNumber,
  currentOffset,
  onChange,
  disabled = false,
}: InlineRowOffsetControlProps) {
  const isCustom = currentOffset !== undefined && currentOffset !== null;

  /**
   * 왼쪽 버튼 클릭: 값 감소 (0.75 → 0.5 → 0.25 → 0 → 기본)
   */
  const handleDecrement = () => {
    if (currentOffset === undefined || currentOffset === null) {
      // 기본 패턴 → 0.75 (가장 높은 값부터)
      onChange(0.75);
      return;
    }

    const currentIdx = OFFSET_VALUES.indexOf(currentOffset);
    if (currentIdx > 0) {
      // 감소
      onChange(OFFSET_VALUES[currentIdx - 1]);
    } else {
      // 0에서 더 감소하면 기본으로 돌아감
      onChange(null);
    }
  };

  /**
   * 오른쪽 버튼 클릭: 값 증가 (기본 → 0 → 0.25 → 0.5 → 0.75)
   */
  const handleIncrement = () => {
    if (currentOffset === undefined || currentOffset === null) {
      // 기본 패턴 → 0부터 시작
      onChange(0);
      return;
    }

    const currentIdx = OFFSET_VALUES.indexOf(currentOffset);
    if (currentIdx < OFFSET_VALUES.length - 1) {
      // 증가
      onChange(OFFSET_VALUES[currentIdx + 1]);
    } else {
      // 0.75에서 더 증가하면 기본으로 돌아감
      onChange(null);
    }
  };

  return (
    <div className="flex items-center gap-0.5" data-capture-ignore>
      {/* 왼쪽 버튼 (감소) */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDecrement}
        disabled={disabled}
        className="w-10 h-10 sm:w-8 sm:h-8 p-0 touch-manipulation active:scale-95 transition-transform hover:bg-[var(--color-primary-100)] text-[var(--color-text-secondary)]"
        aria-label={`${rowNumber}줄 왼쪽으로 이동`}
      >
        <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" />
      </Button>

      {/* 현재 값 표시 (커스텀 값일 때만) */}
      {isCustom && (
        <span className="text-[10px] font-medium text-[var(--color-primary-600)] tabular-nums min-w-[1.5rem] text-center">
          {currentOffset}
        </span>
      )}

      {/* 오른쪽 버튼 (증가) */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleIncrement}
        disabled={disabled}
        className="w-10 h-10 sm:w-8 sm:h-8 p-0 touch-manipulation active:scale-95 transition-transform hover:bg-[var(--color-primary-100)] text-[var(--color-text-secondary)]"
        aria-label={`${rowNumber}줄 오른쪽으로 이동`}
      >
        <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" />
      </Button>
    </div>
  );
}
