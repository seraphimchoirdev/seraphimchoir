'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuarterSelectorProps {
  year: number;
  quarter: number;
  onChange: (year: number, quarter: number) => void;
}

const quarterLabels = [
  '1분기 (1-3월)',
  '2분기 (4-6월)',
  '3분기 (7-9월)',
  '4분기 (10-12월)',
];

export default function QuarterSelector({
  year,
  quarter,
  onChange,
}: QuarterSelectorProps) {
  const handlePrev = () => {
    if (quarter === 1) {
      onChange(year - 1, 4);
    } else {
      onChange(year, quarter - 1);
    }
  };

  const handleNext = () => {
    if (quarter === 4) {
      onChange(year + 1, 1);
    } else {
      onChange(year, quarter + 1);
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrev}
        aria-label="이전 분기"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-center min-w-[140px] sm:min-w-[180px]">
        <div className="text-base sm:text-lg font-bold">{year}년</div>
        <div className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
          {quarterLabels[quarter - 1]}
        </div>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        aria-label="다음 분기"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
