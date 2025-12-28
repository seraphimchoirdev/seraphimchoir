'use client';

import { forwardRef, MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { getPartLabel } from '@/lib/utils';
import { Part } from '@/types';
import { CheckCheck, XCircle, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
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

const PartHeader = forwardRef<HTMLDivElement, PartHeaderProps>(({
  part,
  totalCount,
  attendingCount,
  absentCount,
  isOpen,
  onSelectAll,
  onDeselectAll,
  ...props
}, ref) => {
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
        "w-full flex flex-col gap-2 py-3 px-3 rounded-lg mb-2",
        "transition-colors duration-200 cursor-pointer",
        "bg-[var(--color-primary-50)] hover:bg-[var(--color-primary-100)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] focus:ring-offset-1"
      )}
      {...props}
    >
      {/* 상단: 토글 아이콘 + 파트명 + 통계 + 배지 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {isOpen ? (
            <ChevronDown className="w-5 h-5 flex-shrink-0 text-[var(--color-primary-600)]" />
          ) : (
            <ChevronRight className="w-5 h-5 flex-shrink-0 text-[var(--color-primary-600)]" />
          )}
          <h4 className="font-bold text-[var(--color-primary-700)] truncate">
            {getPartLabel(part)}
          </h4>
          <span className="text-sm text-[var(--color-text-secondary)] flex-shrink-0">
            {attendingCount}/{totalCount}
          </span>
        </div>

        {/* 불참자 배지 또는 전원출석 표시 */}
        {absentCount > 0 ? (
          <span className="px-2 py-0.5 text-xs font-medium bg-[var(--color-error-100)] text-[var(--color-error-700)] rounded-full flex-shrink-0">
            {absentCount}명 불참
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[var(--color-success-100)] text-[var(--color-success-700)] rounded-full flex-shrink-0">
            <CheckCircle className="w-3 h-3" />
            전원출석
          </span>
        )}
      </div>

      {/* 하단: 전체 선택/해제 버튼 */}
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => handleButtonClick(e, onSelectAll)}
          className="text-xs h-7 px-2 text-[var(--color-success-600)] hover:text-[var(--color-success-700)] hover:bg-[var(--color-success-100)]"
        >
          <CheckCheck className="w-4 h-4 mr-1" />
          전체 출석
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => handleButtonClick(e, onDeselectAll)}
          className="text-xs h-7 px-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-gray-100"
        >
          <XCircle className="w-4 h-4 mr-1" />
          전체 불참
        </Button>
      </div>
    </div>
  );
});

PartHeader.displayName = 'PartHeader';

export default PartHeader;
