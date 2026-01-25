'use client';

import { Part } from '@/types';
import { CheckCheck, CheckCircle, ChevronDown, ChevronRight, XCircle } from 'lucide-react';

import { MouseEvent, forwardRef } from 'react';

import { Button } from '@/components/ui/button';

import { getPartLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PartHeaderProps {
  part: Part;
  totalCount: number;
  attendingCount: number;
  absentCount: number;
  isOpen: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const PartHeader = forwardRef<HTMLDivElement, PartHeaderProps>(
  (
    { part, totalCount, attendingCount, absentCount, isOpen, onSelectAll, onDeselectAll, ...props },
    ref
  ) => {
    // 버튼 클릭 시 아코디언 토글 방지
    const handleButtonClick = (e: MouseEvent, action: () => void) => {
      e.stopPropagation();
      action();
    };

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        className={cn(
          'mb-2 flex w-full flex-col gap-2 rounded-lg px-3 py-3',
          'cursor-pointer transition-colors duration-200',
          'bg-[var(--color-primary-50)] hover:bg-[var(--color-primary-100)]',
          'focus:ring-2 focus:ring-[var(--color-primary-300)] focus:ring-offset-1 focus:outline-none'
        )}
        {...props}
      >
        {/* 상단: 토글 아이콘 + 파트명 + 통계 + 배지 */}
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-5 w-5 flex-shrink-0 text-[var(--color-primary-600)]" />
            ) : (
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-[var(--color-primary-600)]" />
            )}
            <h4 className="truncate font-bold text-[var(--color-primary-700)]">
              {getPartLabel(part)}
            </h4>
            <span className="flex-shrink-0 text-sm text-[var(--color-text-secondary)]">
              {attendingCount}/{totalCount}
            </span>
          </div>

          {/* 불참자 배지 또는 전원출석 표시 */}
          {absentCount > 0 ? (
            <span className="flex-shrink-0 rounded-full bg-[var(--color-error-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-error-700)]">
              {absentCount}명 불참
            </span>
          ) : (
            <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-[var(--color-success-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-success-700)]">
              <CheckCircle className="h-3 w-3" />
              전원출석
            </span>
          )}
        </div>

        {/* 하단: 전체 선택/해제 버튼 */}
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => handleButtonClick(e, onSelectAll)}
            className="h-7 px-2 text-xs text-[var(--color-success-600)] hover:bg-[var(--color-success-100)] hover:text-[var(--color-success-700)]"
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            전체 출석
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => handleButtonClick(e, onDeselectAll)}
            className="h-7 px-2 text-xs text-[var(--color-text-tertiary)] hover:bg-gray-100 hover:text-[var(--color-text-secondary)]"
          >
            <XCircle className="mr-1 h-4 w-4" />
            전체 불참
          </Button>
        </div>
      </div>
    );
  }
);

PartHeader.displayName = 'PartHeader';

export default PartHeader;
