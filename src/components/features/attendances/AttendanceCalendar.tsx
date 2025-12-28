'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAttendances } from '@/hooks/useAttendances';
import { useMembers } from '@/hooks/useMembers';
import AttendanceInputModal from './AttendanceInputModal';
import CalendarDayCell from './CalendarDayCell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AttendanceCalendarProps {
  memberId?: string; // 특정 찬양대원의 출석만 표시
}

export default function AttendanceCalendar({ memberId }: AttendanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 월간 데이터 조회
  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data: attendances, isLoading } = useAttendances({
    start_date: startDate,
    end_date: endDate,
    ...(memberId && { member_id: memberId }),
  });

  const { data: members } = useMembers();

  // 캘린더 날짜 생성 (이전/다음 달 포함하여 주 단위로 정렬)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 일요일 시작
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // 특정 날짜의 출석 데이터 가져오기 (메모이제이션)
  const attendancesByDate = useMemo(() => {
    const map = new Map<string, typeof attendances>();

    if (!attendances) return map;

    attendances.forEach((attendance) => {
      const existing = map.get(attendance.date) || [];
      map.set(attendance.date, [...existing, attendance]);
    });

    return map;
  }, [attendances]);

  const getAttendanceForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendancesByDate.get(dateStr) || [];
  };

  // 날짜별 통계 계산 (메모이제이션)
  const getStatsForDate = (date: Date) => {
    const dayAttendances = getAttendanceForDate(date);
    if (dayAttendances.length === 0) return null;

    const available = dayAttendances.filter((a) => a.is_service_available).length;
    const unavailable = dayAttendances.filter((a) => !a.is_service_available).length;
    const total = dayAttendances.length;

    return { available, unavailable, total };
  };

  // 이벤트 핸들러
  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const handleSaveAttendances = () => {
    // 모달이 닫히면 자동으로 React Query가 데이터를 새로고침
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--color-primary-600)] border-r-transparent"></div>
      </div>
    );
  }

  return (
    <Card className="shadow-[var(--shadow-sm)] border-none overflow-hidden">
      {/* 헤더: 월 네비게이션 */}
      <div className="px-6 py-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between">
          <h2 className="heading-3 text-[var(--color-text-primary)]">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousMonth}
              aria-label="이전 달"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              오늘
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              aria-label="다음 달"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <div className="p-6 bg-[var(--color-surface)]">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={`text-center text-sm font-medium py-2 ${index === 0 ? 'text-[var(--color-error-600)]' : index === 6 ? 'text-[var(--color-primary-600)]' : 'text-[var(--color-text-secondary)]'
                }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const stats = getStatsForDate(day);

            return (
              <CalendarDayCell
                key={day.toISOString()}
                date={day}
                attendanceStats={stats}
                isCurrentMonth={isCurrentMonth}
                onClick={handleDateClick}
              />
            );
          })}
        </div>
      </div>

      {/* 범례 */}
      <div className="px-6 py-4 border-t border-[var(--color-border-default)] bg-[var(--color-background-tertiary)]">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[var(--color-success-50)] border border-[var(--color-success-200)] rounded-[var(--radius-xs)]"></div>
            <span className="text-[var(--color-text-secondary)]">출석률 90% 이상</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[var(--color-warning-50)] border border-[var(--color-warning-200)] rounded-[var(--radius-xs)]"></div>
            <span className="text-[var(--color-text-secondary)]">출석률 70-90%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[var(--color-error-50)] border border-[var(--color-error-200)] rounded-[var(--radius-xs)]"></div>
            <span className="text-[var(--color-text-secondary)]">출석률 70% 미만</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 ring-2 ring-[var(--color-primary-500)] rounded-[var(--radius-xs)]"></div>
            <span className="text-[var(--color-text-secondary)]">오늘</span>
          </div>
        </div>
      </div>

      {/* 출석 입력 모달 */}
      {selectedDate && (
        <AttendanceInputModal
          date={selectedDate}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveAttendances}
        />
      )}
    </Card>
  );
}
