'use client';

import { format } from 'date-fns/format';
import { isToday as isTodayFn } from 'date-fns/isToday';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Music } from 'lucide-react';

interface CalendarDayCellProps {
  date: Date;
  attendanceStats: {
    available: number;
    unavailable: number;
    total: number;
  } | null;
  isCurrentMonth: boolean;
  onClick: (date: Date) => void;
  /** 해당 날짜에 예배 일정이 있는지 여부 */
  hasServiceSchedule?: boolean;
  /** 예배 유형 (예: "주일 2부 예배", "오후찬양예배") */
  serviceType?: string;
}

export default function CalendarDayCell({
  date,
  attendanceStats,
  isCurrentMonth,
  onClick,
  hasServiceSchedule = false,
  serviceType,
}: CalendarDayCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isToday = isTodayFn(date);
  const dayOfWeek = date.getDay();
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;

  // 클릭 가능 여부: 예배 일정이 있어야 함
  const isClickable = isCurrentMonth && hasServiceSchedule;

  // 출석률 계산
  const attendanceRate =
    attendanceStats && attendanceStats.total > 0
      ? Math.round((attendanceStats.available / attendanceStats.total) * 100)
      : null;

  // 배경색 결정 (출석률 기반)
  const getBgColor = () => {
    if (!isCurrentMonth) return 'bg-[var(--color-background-tertiary)]';
    // 예배 일정이 없으면 연한 회색 배경
    if (!hasServiceSchedule) return 'bg-[var(--color-background-secondary)]/50';
    if (!attendanceStats || attendanceStats.total === 0) return 'bg-[var(--color-background-primary)]';

    if (attendanceRate !== null) {
      if (attendanceRate >= 90) return 'bg-[var(--color-success-50)]';
      if (attendanceRate >= 70) return 'bg-[var(--color-warning-50)]';
      return 'bg-[var(--color-error-50)]';
    }

    return 'bg-[var(--color-background-primary)]';
  };

  // 호버 시 배경색
  const getHoverBgColor = () => {
    if (!isCurrentMonth) return '';
    // 예배 일정이 없으면 호버 효과 없음
    if (!hasServiceSchedule) return '';
    if (!attendanceStats || attendanceStats.total === 0) return 'hover:bg-[var(--color-background-secondary)]';

    if (attendanceRate !== null) {
      if (attendanceRate >= 90) return 'hover:bg-[var(--color-success-100)]';
      if (attendanceRate >= 70) return 'hover:bg-[var(--color-warning-100)]';
      return 'hover:bg-[var(--color-error-100)]';
    }

    return 'hover:bg-[var(--color-background-secondary)]';
  };

  // 날짜 텍스트 색상
  const getDateColor = () => {
    if (!isCurrentMonth) return 'text-[var(--color-text-disabled)]';
    // 예배 일정이 없으면 흐리게 표시
    if (!hasServiceSchedule) {
      if (isToday) return 'text-[var(--color-primary-400)] font-bold';
      return 'text-[var(--color-text-disabled)]';
    }
    if (isToday) return 'text-[var(--color-primary-600)] font-bold';
    if (isSunday) return 'text-[var(--color-error-600)]';
    if (isSaturday) return 'text-[var(--color-primary-600)]';
    return 'text-[var(--color-text-primary)]';
  };

  return (
    <div
      className={cn(
        'relative min-h-[100px] border border-[var(--color-border-default)] rounded-lg p-2 transition-all',
        getBgColor(),
        getHoverBgColor(),
        isToday && hasServiceSchedule && 'ring-2 ring-[var(--color-primary-500)]',
        isToday && !hasServiceSchedule && 'ring-1 ring-[var(--color-primary-300)]',
        isClickable ? 'cursor-pointer' : 'cursor-default',
        isClickable && 'group'
      )}
      onClick={() => isClickable && onClick(date)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 날짜 및 예배 일정 표시 */}
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-1">
          <span className={cn('text-sm font-medium', getDateColor())}>
            {format(date, 'd')}
          </span>
          {/* 예배 일정이 있으면 아이콘 표시 */}
          {isCurrentMonth && hasServiceSchedule && (
            <Music className="h-3 w-3 text-[var(--color-primary-500)]" />
          )}
        </div>

        {/* 빠른 입력 버튼 (호버 시 표시, 예배 일정이 있을 때만) */}
        {isClickable && isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(date);
            }}
            className="p-1 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] transition-colors opacity-0 group-hover:opacity-100"
            aria-label="출석 입력"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 예배 유형 표시 (예배 일정이 있을 때) */}
      {isCurrentMonth && hasServiceSchedule && serviceType && (
        <div className="text-xs text-[var(--color-primary-600)] font-medium truncate mb-1">
          {serviceType}
        </div>
      )}

      {/* 출석 통계 */}
      {isCurrentMonth && attendanceStats && attendanceStats.total > 0 && (
        <div className="space-y-1">
          {attendanceStats.available > 0 && (
            <div className="text-xs bg-[var(--color-success-100)] text-[var(--color-success-800)] px-2 py-1 rounded border border-[var(--color-success-200)]">
              출석: {attendanceStats.available}명
            </div>
          )}
          {attendanceStats.unavailable > 0 && (
            <div className="text-xs bg-[var(--color-error-100)] text-[var(--color-error-800)] px-2 py-1 rounded border border-[var(--color-error-200)]">
              불참: {attendanceStats.unavailable}명
            </div>
          )}
          {attendanceRate !== null && (
            <div className="text-xs text-[var(--color-text-secondary)] font-medium mt-1">
              {attendanceRate}%
            </div>
          )}
        </div>
      )}

      {/* 툴팁 (호버 시 표시) */}
      {isCurrentMonth && isHovered && (
        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-neutral-900)] text-white text-xs rounded-md shadow-lg whitespace-nowrap pointer-events-none">
          <div className="space-y-1">
            {hasServiceSchedule ? (
              <>
                {serviceType && <div className="font-medium">{serviceType}</div>}
                {attendanceStats && attendanceStats.total > 0 ? (
                  <>
                    <div>출석: {attendanceStats.available}명</div>
                    <div>불참: {attendanceStats.unavailable}명</div>
                    <div>출석률: {attendanceRate}%</div>
                  </>
                ) : (
                  <div className="text-[var(--color-neutral-300)]">클릭하여 출석 입력</div>
                )}
              </>
            ) : (
              <div className="text-[var(--color-neutral-300)]">예배 일정 없음</div>
            )}
          </div>
          {/* 툴팁 화살표 */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-[var(--color-neutral-900)]"></div>
          </div>
        </div>
      )}
    </div>
  );
}
