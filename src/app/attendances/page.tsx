'use client';

import { addMonths } from 'date-fns/addMonths';
import { addWeeks } from 'date-fns/addWeeks';
import { format } from 'date-fns/format';
import { isSunday } from 'date-fns/isSunday';
import { nextSunday } from 'date-fns/nextSunday';
import { subMonths } from 'date-fns/subMonths';
import { subWeeks } from 'date-fns/subWeeks';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Music } from 'lucide-react';

import { useMemo, useState } from 'react';

import AttendanceList from '@/components/features/attendances/AttendanceList';
import AppShell from '@/components/layout/AppShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';

import { useAuth } from '@/hooks/useAuth';
import { useServiceSchedules } from '@/hooks/useServiceSchedules';

export default function AttendancesPage() {
  const { hasRole, isLoading: authLoading } = useAuth();

  // 출석 관리 권한: ADMIN, CONDUCTOR, MANAGER, PART_LEADER
  const hasPermission = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']);

  // 기본값: 다가오는 주일 (오늘이 주일이면 오늘)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    if (isSunday(today)) return today;
    return nextSunday(today);
  });

  // 날짜 네비게이션
  const handlePrevWeek = () => setSelectedDate((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setSelectedDate((prev) => addWeeks(prev, 1));

  // 캘린더에 표시될 범위의 예배 일정 조회 (전후 3개월)
  const calendarStartDate = format(subMonths(selectedDate, 3), 'yyyy-MM-dd');
  const calendarEndDate = format(addMonths(selectedDate, 3), 'yyyy-MM-dd');

  const { data: serviceSchedulesResponse } = useServiceSchedules({
    startDate: calendarStartDate,
    endDate: calendarEndDate,
  });

  // 예배 일정이 있는 날짜들의 Set (O(1) 조회)
  const serviceScheduleDates = useMemo(() => {
    const dates = new Set<string>();
    if (serviceSchedulesResponse?.data) {
      serviceSchedulesResponse.data.forEach((schedule) => {
        dates.add(schedule.date);
      });
    }
    return dates;
  }, [serviceSchedulesResponse]);

  // 선택한 날짜의 예배 일정 정보
  const selectedSchedule = useMemo(() => {
    if (!serviceSchedulesResponse?.data) return null;
    return serviceSchedulesResponse.data.find(
      (schedule) => schedule.date === format(selectedDate, 'yyyy-MM-dd')
    );
  }, [serviceSchedulesResponse, selectedDate]);

  // 예배 일정이 없는 날짜는 비활성화
  const isDateDisabled = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return !serviceScheduleDates.has(dateStr);
  };

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-tertiary)] py-20">
          <Spinner size="lg" variant="default" />
        </div>
      </AppShell>
    );
  }

  if (!hasPermission) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[var(--color-background-tertiary)]">
          <div className="container mx-auto max-w-2xl px-4 py-8">
            <Alert variant="error">
              <AlertDescription>출석 관리 페이지에 접근할 권한이 없습니다.</AlertDescription>
            </Alert>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)]">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* 헤더 */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="heading-2 text-[var(--color-text-primary)]">출석 관리</h2>
                  <p className="body-base mt-1 text-[var(--color-text-secondary)]">
                    주일 예배 등단 및 연습 참석 현황을 관리합니다.
                  </p>
                </div>
              </div>

              {/* 날짜 선택 UI */}
              <div className="flex flex-col justify-between gap-4 border-t border-[var(--color-border-subtle)] pt-4 md:flex-row md:items-center">
                {selectedSchedule && (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-primary-600)]">
                    <Music className="h-4 w-4" />
                    <span className="font-medium">
                      {selectedSchedule.service_type || '주일예배'}
                    </span>
                    {selectedSchedule.hymn_name && (
                      <span className="text-[var(--color-primary-500)]">
                        • {selectedSchedule.hymn_name}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 rounded-lg bg-[var(--color-background-secondary)] p-2">
                  <Button variant="ghost" size="icon" onClick={handlePrevWeek}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="min-w-[160px] border-none bg-transparent text-lg font-medium shadow-sm hover:bg-white"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, 'yyyy-MM-dd')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date instanceof Date && !isDateDisabled(date)) {
                            setSelectedDate(date);
                          }
                        }}
                        disabled={isDateDisabled}
                        initialFocus
                      />
                      <div className="text-muted-foreground border-t px-3 py-2 text-xs">
                        <Music className="mr-1 inline h-3 w-3" />
                        예배 일정이 등록된 날짜만 선택 가능
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button variant="ghost" size="icon" onClick={handleNextWeek}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 출석 목록 */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <AttendanceList date={selectedDate} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
