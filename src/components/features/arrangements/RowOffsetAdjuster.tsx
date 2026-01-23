'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { RowOffsetValue } from '@/types/grid';

/**
 * 오프셋 값 배열 (순환용)
 * null은 "기본 패턴"을 의미하며 UI에서 별도 처리
 */
const OFFSET_VALUES: RowOffsetValue[] = [0, 0.25, 0.5, 0.75];

/**
 * 오프셋 값에 대한 시각적 위치 (0-3 인덱스)
 */
function getOffsetIndex(value: RowOffsetValue | undefined): number {
  if (value === null || value === undefined) return -1; // 기본 패턴
  return OFFSET_VALUES.indexOf(value);
}

/**
 * 오프셋 값을 표시 문자열로 변환
 */
function formatOffsetValue(value: RowOffsetValue | undefined): string {
  if (value === null || value === undefined) return '기본';
  if (value === 0) return '0';
  return String(value);
}

interface RowOffsetAdjusterProps {
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
 * 행별 오프셋 조정 컴포넌트
 *
 * 화살표 버튼으로 0.25 단위로 오프셋을 조정하며,
 * 시각적 슬라이더로 현재 위치를 표시합니다.
 *
 * ```
 * 1줄: [◀] ━━━○━━━ [▶]  0.5
 * ```
 */
export default function RowOffsetAdjuster({
  rowNumber,
  currentOffset,
  onChange,
  disabled = false,
}: RowOffsetAdjusterProps) {
  const currentIndex = getOffsetIndex(currentOffset);
  const isCustom = currentOffset !== undefined && currentOffset !== null;

  /**
   * 왼쪽 버튼 클릭: 값 감소 (0.75 → 0.5 → 0.25 → 0)
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
   * 오른쪽 버튼 클릭: 값 증가 (0 → 0.25 → 0.5 → 0.75)
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

  /**
   * 기본값으로 초기화
   */
  const handleReset = () => {
    onChange(null);
  };

  return (
    <div className="flex items-center gap-2">
      {/* 행 번호 라벨 */}
      <span
        className={`text-sm w-10 font-medium ${
          isCustom
            ? 'text-[var(--color-primary-600)]'
            : 'text-[var(--color-text-secondary)]'
        }`}
      >
        {rowNumber}줄
      </span>

      {/* 감소 버튼 */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDecrement}
        disabled={disabled}
        className="h-8 w-8 p-0 hover:bg-[var(--color-primary-100)]"
        aria-label={`${rowNumber}줄 오프셋 감소`}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* 시각적 슬라이더 */}
      <div className="flex-1 flex items-center gap-1 min-w-[80px]">
        <div className="relative flex-1 h-2 bg-[var(--color-border-subtle)] rounded-full overflow-hidden">
          {/* 트랙 마커 (4개 위치) */}
          <div className="absolute inset-0 flex items-center justify-between px-1">
            {OFFSET_VALUES.map((val, idx) => (
              <div
                key={val}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  currentIndex === idx
                    ? 'bg-[var(--color-primary-600)] ring-2 ring-[var(--color-primary-300)] ring-offset-1'
                    : 'bg-[var(--color-text-tertiary)] opacity-40'
                }`}
                title={`${val}칸`}
              />
            ))}
          </div>

          {/* 기본 패턴 표시 (없음 상태) */}
          {!isCustom && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-0.5 bg-[var(--color-text-tertiary)] opacity-20 rounded" />
            </div>
          )}
        </div>
      </div>

      {/* 증가 버튼 */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleIncrement}
        disabled={disabled}
        className="h-8 w-8 p-0 hover:bg-[var(--color-primary-100)]"
        aria-label={`${rowNumber}줄 오프셋 증가`}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* 현재 값 표시 */}
      <span
        className={`text-xs w-8 text-right tabular-nums ${
          isCustom
            ? 'text-[var(--color-primary-600)] font-semibold'
            : 'text-[var(--color-text-tertiary)]'
        }`}
      >
        {formatOffsetValue(currentOffset)}
      </span>

      {/* 기본값 초기화 버튼 (커스텀 값일 때만 표시) */}
      {isCustom && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleReset}
          disabled={disabled}
          className="h-6 w-6 p-0 text-[var(--color-text-tertiary)] hover:text-[var(--color-error-600)] hover:bg-[var(--color-error-100)]"
          aria-label={`${rowNumber}줄 기본값으로 초기화`}
          title="기본값으로"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
