'use client';

import { addMonths } from 'date-fns/addMonths';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { endOfMonth } from 'date-fns/endOfMonth';
import { endOfWeek } from 'date-fns/endOfWeek';
import { format as formatDate } from 'date-fns/format';
import { isSameDay } from 'date-fns/isSameDay';
import { isSameMonth } from 'date-fns/isSameMonth';
import { isToday } from 'date-fns/isToday';
import { ko } from 'date-fns/locale/ko';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { subMonths } from 'date-fns/subMonths';

import * as React from 'react';

export interface CalendarProps {
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date | Date[] | { from: Date; to?: Date };
  onSelect?: (date: Date | Date[] | { from: Date; to?: Date } | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  initialFocus?: boolean;
}

export function Calendar({
  mode = 'single',
  selected,
  onSelect,
  disabled,
  className = '',
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected && mode === 'single' && selected instanceof Date ? selected : new Date()
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const handleDateClick = (date: Date) => {
    if (disabled && disabled(date)) return;

    if (mode === 'single') {
      onSelect?.(date);
    }
  };

  const isSelected = (date: Date) => {
    if (!selected) return false;
    if (mode === 'single' && selected instanceof Date) {
      return isSameDay(date, selected);
    }
    return false;
  };

  return (
    <div className={`p-3 ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="rounded-md p-2 transition-colors hover:bg-[var(--color-background-tertiary)]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="text-sm font-semibold">
          {formatDate(currentMonth, 'yyyy년 M월', { locale: ko })}
        </div>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="rounded-md p-2 transition-colors hover:bg-[var(--color-background-tertiary)]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Week days */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`p-2 text-center text-xs font-medium ${index === 0 ? 'text-[var(--color-error-600)]' : index === 6 ? 'text-[var(--color-primary-600)]' : 'text-[var(--color-text-secondary)]'} `}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isDayToday = isToday(day);
          const isDaySelected = isSelected(day);
          const isDayDisabled = disabled ? disabled(day) : false;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDateClick(day)}
              disabled={isDayDisabled}
              className={`relative rounded-md p-2 text-sm transition-all duration-150 ${!isCurrentMonth ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'} ${isDayToday ? 'font-bold' : ''} ${
                isDaySelected
                  ? 'bg-[var(--color-primary-400)] text-white hover:bg-[var(--color-primary-500)]'
                  : 'hover:bg-[var(--color-background-tertiary)]'
              } ${isDayDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${index % 7 === 0 && isCurrentMonth ? 'text-[var(--color-error-600)]' : ''} ${index % 7 === 6 && isCurrentMonth ? 'text-[var(--color-primary-600)]' : ''} `}
            >
              {formatDate(day, 'd')}
              {isDayToday && !isDaySelected && (
                <div className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--color-primary-400)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
