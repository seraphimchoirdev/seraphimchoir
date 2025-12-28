'use client';

import { format, isSameDay, isToday as isTodayFn } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface CalendarDayCellProps {
  date: Date;
  attendanceStats: {
    available: number;
    unavailable: number;
    total: number;
  } | null;
  isCurrentMonth: boolean;
  onClick: (date: Date) => void;
}

export default function CalendarDayCell({
  date,
  attendanceStats,
  isCurrentMonth,
  onClick,
}: CalendarDayCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isToday = isTodayFn(date);
  const dayOfWeek = date.getDay();
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;

  // 출석률 계산
  const attendanceRate =
    attendanceStats && attendanceStats.total > 0
      ? Math.round((attendanceStats.available / attendanceStats.total) * 100)
      : null;

  // 배경색 결정 (출석률 기반)
  const getBgColor = () => {
    if (!isCurrentMonth) return 'bg-gray-50';
    if (!attendanceStats || attendanceStats.total === 0) return 'bg-white';

    if (attendanceRate !== null) {
      if (attendanceRate >= 90) return 'bg-green-50';
      if (attendanceRate >= 70) return 'bg-yellow-50';
      return 'bg-red-50';
    }

    return 'bg-white';
  };

  // 호버 시 배경색
  const getHoverBgColor = () => {
    if (!isCurrentMonth) return 'hover:bg-gray-100';
    if (!attendanceStats || attendanceStats.total === 0) return 'hover:bg-gray-50';

    if (attendanceRate !== null) {
      if (attendanceRate >= 90) return 'hover:bg-green-100';
      if (attendanceRate >= 70) return 'hover:bg-yellow-100';
      return 'hover:bg-red-100';
    }

    return 'hover:bg-gray-50';
  };

  // 날짜 텍스트 색상
  const getDateColor = () => {
    if (!isCurrentMonth) return 'text-gray-400';
    if (isToday) return 'text-indigo-600 font-bold';
    if (isSunday) return 'text-red-600';
    if (isSaturday) return 'text-blue-600';
    return 'text-gray-900';
  };

  return (
    <div
      className={cn(
        'relative min-h-[100px] border border-gray-200 rounded-lg p-2 cursor-pointer transition-all',
        getBgColor(),
        getHoverBgColor(),
        isToday && 'ring-2 ring-indigo-500',
        'group'
      )}
      onClick={() => onClick(date)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 날짜 */}
      <div className="flex justify-between items-start mb-1">
        <span className={cn('text-sm font-medium', getDateColor())}>
          {format(date, 'd')}
        </span>

        {/* 빠른 입력 버튼 (호버 시 표시) */}
        {isCurrentMonth && isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(date);
            }}
            className="p-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors opacity-0 group-hover:opacity-100"
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

      {/* 출석 통계 */}
      {isCurrentMonth && attendanceStats && attendanceStats.total > 0 && (
        <div className="space-y-1">
          {attendanceStats.available > 0 && (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded border border-green-200">
              출석: {attendanceStats.available}명
            </div>
          )}
          {attendanceStats.unavailable > 0 && (
            <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded border border-red-200">
              불참: {attendanceStats.unavailable}명
            </div>
          )}
          {attendanceRate !== null && (
            <div className="text-xs text-gray-600 font-medium mt-1">
              {attendanceRate}%
            </div>
          )}
        </div>
      )}

      {/* 툴팁 (호버 시 표시) - 간단 버전 */}
      {isCurrentMonth && isHovered && attendanceStats && attendanceStats.total > 0 && (
        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md shadow-lg whitespace-nowrap pointer-events-none">
          <div className="space-y-1">
            <div>출석: {attendanceStats.available}명</div>
            <div>불참: {attendanceStats.unavailable}명</div>
            <div>출석률: {attendanceRate}%</div>
          </div>
          {/* 툴팁 화살표 */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}
