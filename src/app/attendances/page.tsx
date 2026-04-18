'use client';

import { format } from 'date-fns/format';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, Music } from 'lucide-react';

import { useMemo, useState } from 'react';

import AttendanceList from '@/components/features/attendances/AttendanceList';
import ReadinessStatusBar from '@/components/features/attendances/ReadinessStatusBar';
import AppShell from '@/components/layout/AppShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

import { useAttendanceDeadlines, useCloseAttendance } from '@/hooks/useAttendanceDeadlines';
import { useAuth } from '@/hooks/useAuth';
import { useServiceDateNavigation } from '@/hooks/useServiceDateNavigation';
import { useServiceSchedules, useServiceSchedulesByDate } from '@/hooks/useServiceSchedules';
import { useUserPart } from '@/hooks/useUserPart';

export default function AttendancesPage() {
  const { hasRole, profile, isLoading: authLoading } = useAuth();
  const { userPart } = useUserPart();

  // 출석 관리 권한: ADMIN, CONDUCTOR, MANAGER, PART_LEADER
  const hasPermission = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']);

  // 예배 일정 기반 날짜 네비게이션
  const { selectedDate: dateStr, hasPrev, hasNext, goToPrev, goToNext, setDate } = useServiceDateNavigation();

  // 준비 완료 상태 조회 및 마크
  const { data: deadlines, isLoading: deadlinesLoading } = useAttendanceDeadlines(dateStr);
  const closeMutation = useCloseAttendance();

  // 선택된 예배 일정 ID (사용자가 드롭다운에서 선택한 값, 없으면 자동 선택)
  const [manualServiceScheduleId, setManualServiceScheduleId] = useState<string | undefined>();

  // 날짜 이동 시 수동 선택 초기화하는 래퍼
  const handlePrev = () => { goToPrev(); setManualServiceScheduleId(undefined); };
  const handleNext = () => { goToNext(); setManualServiceScheduleId(undefined); };

  // Date 객체 (Calendar, AttendanceList용)
  const selectedDateObj = useMemo(() => new Date(dateStr + 'T00:00:00'), [dateStr]);

  // 캘린더에 표시될 범위의 예배 일정 조회 (전후 3개월)
  const calStart = new Date(selectedDateObj);
  calStart.setMonth(calStart.getMonth() - 3);
  const calEnd = new Date(selectedDateObj);
  calEnd.setMonth(calEnd.getMonth() + 3);
  const calendarStartDate = format(calStart, 'yyyy-MM-dd');
  const calendarEndDate = format(calEnd, 'yyyy-MM-dd');

  const { data: serviceSchedulesResponse } = useServiceSchedules({
    startDate: calendarStartDate,
    endDate: calendarEndDate,
  });

  // 선택한 날짜의 모든 예배 일정
  const { data: schedulesForDate } = useServiceSchedulesByDate(dateStr);

  // 시간순 정렬된 예배 목록 (service_start_time 기준 오름차순)
  const sortedSchedules = useMemo(() => {
    if (!schedulesForDate || schedulesForDate.length === 0) return [];
    return [...schedulesForDate].sort((a, b) => {
      const timeA = a.service_start_time || '99:99';
      const timeB = b.service_start_time || '99:99';
      return String(timeA).localeCompare(String(timeB));
    });
  }, [schedulesForDate]);

  // 실제 사용되는 serviceScheduleId: 수동 선택값이 유효하면 사용, 아니면 시간이 가장 빠른 예배 자동 선택
  const selectedServiceScheduleId = useMemo(() => {
    if (sortedSchedules.length === 0) return undefined;
    // 수동 선택값이 현재 날짜의 schedules에 있으면 사용
    if (manualServiceScheduleId && sortedSchedules.some(s => s.id === manualServiceScheduleId)) {
      return manualServiceScheduleId;
    }
    // 없으면 시간이 가장 빠른 예배 자동 선택
    return sortedSchedules[0].id;
  }, [sortedSchedules, manualServiceScheduleId]);

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

  // 현재 선택된 예배 일정 정보
  const selectedSchedule = useMemo(() => {
    if (sortedSchedules.length === 0 || !selectedServiceScheduleId) return null;
    return sortedSchedules.find((s) => s.id === selectedServiceScheduleId) ?? null;
  }, [sortedSchedules, selectedServiceScheduleId]);

  // 예배 일정이 없는 날짜는 비활성화
  const isDateDisabled = (date: Date) => {
    const d = format(date, 'yyyy-MM-dd');
    return !serviceScheduleDates.has(d);
  };

  const hasMultipleServices = sortedSchedules.length > 1;

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
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-6 shadow-[var(--shadow-sm)]">
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
                  <Button variant="ghost" size="icon" onClick={handlePrev} disabled={!hasPrev}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="min-w-[160px] border-none bg-transparent text-lg font-medium shadow-sm hover:bg-[var(--color-background-primary)]"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateStr}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDateObj}
                        onSelect={(date) => {
                          if (date instanceof Date && !isDateDisabled(date)) {
                            setDate(format(date, 'yyyy-MM-dd'));
                            setManualServiceScheduleId(undefined);
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

                  <Button variant="ghost" size="icon" onClick={handleNext} disabled={!hasNext}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* 예배 선택 드롭다운 (2개 이상일 때만 표시) */}
              {hasMultipleServices && (
                <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-4 space-y-3">
                  {/* 다중 예배 안내 문구 */}
                  <div className="flex items-center gap-2 rounded-lg bg-[var(--color-primary-50)] px-3 py-2 text-sm text-[var(--color-primary-700)]">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>
                      이 날짜에 예배가 {sortedSchedules.length}개 등록되어 있습니다. 아래에서 예배를 선택해주세요.
                    </span>
                  </div>
                  {/* 예배 선택 드롭다운 */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[var(--color-text-secondary)]">예배:</span>
                    <Select
                      value={selectedServiceScheduleId}
                      onValueChange={setManualServiceScheduleId}
                    >
                      <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="예배를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedSchedules.map((schedule) => (
                          <SelectItem key={schedule.id} value={schedule.id}>
                            {schedule.service_type || '예배'}
                            {schedule.service_start_time
                              ? ` (${String(schedule.service_start_time).slice(0, 5)})`
                              : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* 준비 완료 현황 */}
            {hasPermission && (
              <ReadinessStatusBar
                date={dateStr}
                deadlines={deadlines}
                isLoading={deadlinesLoading}
                userRole={profile?.role ?? undefined}
                userPart={userPart}
              />
            )}

            {/* 출석 목록 */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-6 shadow-[var(--shadow-sm)]">
              <AttendanceList
                date={selectedDateObj}
                serviceScheduleId={selectedServiceScheduleId}
                deadlines={deadlines}
                onMarkReady={async (part) => {
                  await closeMutation.mutateAsync({ date: dateStr, part });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
