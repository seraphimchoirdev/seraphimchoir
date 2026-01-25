'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface MonthSelectorProps {
  year: number;
  month: number; // 1-12
  onChange: (year: number, month: number) => void;
}

const monthLabels = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
];

export default function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  const handlePrev = () => {
    if (month === 1) {
      onChange(year - 1, 12);
    } else {
      onChange(year, month - 1);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      onChange(year + 1, 1);
    } else {
      onChange(year, month + 1);
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <Button variant="outline" size="icon" onClick={handlePrev} aria-label="이전 월">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[100px] text-center sm:min-w-[120px]">
        <div className="text-base font-bold sm:text-lg">{year}년</div>
        <div className="text-xs text-[var(--color-text-secondary)] sm:text-sm">
          {monthLabels[month - 1]}
        </div>
      </div>
      <Button variant="outline" size="icon" onClick={handleNext} aria-label="다음 월">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
