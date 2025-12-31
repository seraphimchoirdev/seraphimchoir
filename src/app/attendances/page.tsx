'use client';

import { useState, useMemo } from 'react';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/hooks/useAuth';
import AttendanceList from '@/components/features/attendances/AttendanceList';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Music } from 'lucide-react';
import { format, addWeeks, subWeeks, nextSunday, isSunday, subMonths, addMonths } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useServiceSchedules } from '@/hooks/useServiceSchedules';

export default function AttendancesPage() {
  const { profile } = useAuth();

  // 기본값: 다가오는 주일 (오늘이 주일이면 오늘)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    if (isSunday(today)) return today;
    return nextSunday(today);
  });

  // 날짜 네비게이션
  const handlePrevWeek = () => setSelectedDate(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setSelectedDate(prev => addWeeks(prev, 1));

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

  return (
    <div className="min-h-screen bg-[var(--color-background-tertiary)]">
      <Navigation />

      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 헤더 */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="heading-2 text-[var(--color-text-primary)]">출석 관리</h2>
                <p className="mt-1 body-base text-[var(--color-text-secondary)]">
                  주일 예배 등단 및 연습 참석 현황을 관리합니다.
                </p>
              </div>
            </div>

            {/* 날짜 선택 UI */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-gray-100">
                {selectedSchedule && (
                  <div className="flex items-center gap-2 text-sm text-indigo-600">
                    <Music className="h-4 w-4" />
                    <span className="font-medium">{selectedSchedule.service_type || '주일예배'}</span>
                    {selectedSchedule.hymn_name && (
                      <span className="text-indigo-500">• {selectedSchedule.hymn_name}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg">
                  <Button variant="ghost" size="icon" onClick={handlePrevWeek}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="min-w-[160px] font-medium text-lg border-none bg-transparent hover:bg-white shadow-sm">
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
                      <div className="px-3 py-2 border-t text-xs text-muted-foreground">
                        <Music className="inline h-3 w-3 mr-1" />
                        예배 일정이 등록된 날짜만 선택 가능
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button variant="ghost" size="icon" onClick={handleNextWeek}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
          </div>

          {/* 권한 없음 메시지 */}
          {!profile?.role && (
            <Alert variant="warning">
              <AlertDescription>
                아직 관리자가 역할을 부여하지 않았습니다. 역할이 부여되면 출석을 등록하고 관리할 수 있습니다.
              </AlertDescription>
            </Alert>
          )}

          {/* 출석 목록 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <AttendanceList date={selectedDate} />
          </div>
        </div>
      </div>
    </div>
  );
}
