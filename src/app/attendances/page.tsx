'use client';

import { useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/hooks/useAuth';
import AttendanceList from '@/components/features/attendances/AttendanceList';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, nextSunday, isSunday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

export default function AttendancesPage() {
  const { hasRole, profile } = useAuth();

  // 기본값: 다가오는 주일 (오늘이 주일이면 오늘)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    if (isSunday(today)) return today;
    return nextSunday(today);
  });

  // 날짜 네비게이션
  const handlePrevWeek = () => setSelectedDate(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setSelectedDate(prev => addWeeks(prev, 1));

  return (
    <div className="min-h-screen bg-[var(--color-background-tertiary)]">
      <Navigation />

      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 헤더 & 날짜 선택 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm">
            <div>
              <h2 className="heading-2 text-[var(--color-text-primary)]">출석 관리</h2>
              <p className="mt-1 body-base text-[var(--color-text-secondary)]">
                주일 예배 등단 및 연습 참석 현황을 관리합니다.
              </p>
            </div>

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
                      if (date instanceof Date) {
                        setSelectedDate(date);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button variant="ghost" size="icon" onClick={handleNextWeek}>
                <ChevronRight className="w-5 h-5" />
              </Button>
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

          {/* 출석 리스트 뷰 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <AttendanceList date={selectedDate} />
          </div>
        </div>
      </div>
    </div>
  );
}
