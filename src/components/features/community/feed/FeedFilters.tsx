'use client';

import { format as formatDate } from 'date-fns/format';
import { ko } from 'date-fns/locale/ko';
import { CalendarDays, Search, X } from 'lucide-react';

import { useEffect, useRef, useState } from 'react';

import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface FeedFiltersProps {
  search: string;
  date: string; // ISO date string, e.g. '2026-04-21'
  onSearchChange: (search: string) => void;
  onDateChange: (date: string) => void;
}

export default function FeedFilters({
  search,
  date,
  onSearchChange,
  onDateChange,
}: FeedFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 디바운스 검색
  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [localSearch, onSearchChange]);

  // 외부에서 search가 초기화되면 로컬도 동기화
  useEffect(() => {
    if (search === '' && localSearch !== '') {
      setLocalSearch('');
    }
  }, [search]);

  const selectedDate = date ? new Date(date + 'T00:00:00') : undefined;

  const handleDateSelect = (d: Date | Date[] | { from: Date; to?: Date } | undefined) => {
    if (d instanceof Date) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      onDateChange(iso);
      setCalendarOpen(false);
    }
  };

  const dateLabel = selectedDate
    ? formatDate(selectedDate, 'M월 d일', { locale: ko })
    : null;

  return (
    <div className="space-y-2">
      {/* 검색 + 캘린더 버튼 */}
      <div className="flex items-center gap-2">
        {/* 검색 입력 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="게시글 검색"
            className="w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-background-primary)] py-2.5 pl-10 pr-10 text-base focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)]"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 날짜 선택 */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              className={`shrink-0 rounded-lg border p-2.5 transition-colors ${
                date
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
                  : 'border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-background-secondary)]'
              }`}
            >
              <CalendarDays className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* 활성 날짜 필터 칩 */}
      {dateLabel && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-100)] px-3 py-1 text-sm font-medium text-[var(--color-primary-700)]">
            <CalendarDays className="h-3.5 w-3.5" />
            {dateLabel}
            <button
              onClick={() => onDateChange('')}
              className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--color-primary-200)]"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
