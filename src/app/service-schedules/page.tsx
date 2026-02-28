'use client';

import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CalendarRange,
  FileSpreadsheet,
  Music,
  PartyPopper,
  Plus,
} from 'lucide-react';

import { useCallback, useMemo, useState } from 'react';

import {
  MonthSelector,
  MonthlyCalendar,
  QuarterSelector,
  QuarterlyCalendar,
  ServiceScheduleDialog,
  ServiceScheduleImporter,
  UpcomingCalendar,
} from '@/components/features/service-schedules';
import EventDialog from '@/components/features/service-schedules/EventDialog';
import AppShell from '@/components/layout/AppShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';

import { useAuth } from '@/hooks/useAuth';
import { useChoirEvents } from '@/hooks/useChoirEvents';
import { useServiceSchedules } from '@/hooks/useServiceSchedules';

type ViewMode = 'upcoming' | 'monthly' | 'quarterly';

export default function ServiceSchedulesPage() {
  const { hasRole, isLoading: authLoading } = useAuth();

  const hasPermission = hasRole([
    'ADMIN',
    'CONDUCTOR',
    'MANAGER',
    'STAFF',
    'PART_LEADER',
    'MEMBER',
  ]);
  const canManageService = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER']);
  const canManageEvents = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER']);

  const currentDate = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('upcoming');
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.ceil((currentDate.getMonth() + 1) / 3));

  // 다가오는 일정 날짜 범위 (오늘~5주 후)
  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const fiveWeeksLaterStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 35);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // 예배 일정 추가 다이얼로그 상태
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // 뷰 모드에 따른 필터 설정
  const scheduleFilters = useMemo(() => {
    switch (viewMode) {
      case 'upcoming':
        return { startDate: todayStr, endDate: fiveWeeksLaterStr };
      case 'monthly':
        return { year, month };
      case 'quarterly':
        return { year, quarter };
    }
  }, [viewMode, year, month, quarter, todayStr, fiveWeeksLaterStr]);

  const { data, isLoading, error, refetch } = useServiceSchedules(scheduleFilters);

  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useChoirEvents(scheduleFilters);

  const handleRefresh = useCallback(() => {
    refetch();
    refetchEvents();
  }, [refetch, refetchEvents]);

  // "지난 일정 보기" → 월간 뷰 + 현재 월로 전환
  const handleShowPastSchedules = useCallback(() => {
    const now = new Date();
    setViewMode('monthly');
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }, []);

  // 설명 문구
  const description = useMemo(() => {
    switch (viewMode) {
      case 'upcoming':
        return '다가오는 예배 및 행사 일정입니다';
      case 'monthly':
        return '월별 예배 및 행사 일정을 관리합니다';
      case 'quarterly':
        return '분기별 예배 및 행사 일정을 관리합니다';
    }
  }, [viewMode]);

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-tertiary)] py-20">
          <Spinner size="lg" />
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
              <AlertDescription>찬양대 일정 페이지에 접근할 권한이 없습니다.</AlertDescription>
            </Alert>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)]">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* 헤더 - 타이틀 영역 */}
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
                찬양대 일정 관리
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
            </div>

            {/* 컨트롤 영역 */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              {/* 좌측: 날짜 선택기 */}
              <div>
                {viewMode === 'upcoming' ? (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-[var(--color-primary-500)]" />
                    <div>
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        다가오는 일정
                      </span>
                      <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">
                        (향후 5주)
                      </span>
                    </div>
                  </div>
                ) : viewMode === 'monthly' ? (
                  <MonthSelector
                    year={year}
                    month={month}
                    onChange={(y, m) => {
                      setYear(y);
                      setMonth(m);
                    }}
                  />
                ) : (
                  <QuarterSelector
                    year={year}
                    quarter={quarter}
                    onChange={(y, q) => {
                      setYear(y);
                      setQuarter(q);
                    }}
                  />
                )}
              </div>

              {/* 우측: 뷰 토글 + 액션 버튼 */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* 뷰 전환 토글 (3개) */}
                <div className="flex items-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-background-secondary)] p-0.5">
                  <Button
                    variant={viewMode === 'upcoming' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => setViewMode('upcoming')}
                  >
                    <CalendarDays className="h-4 w-4" />
                    <span className="hidden sm:inline">다가오는</span>
                  </Button>
                  <Button
                    variant={viewMode === 'monthly' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => setViewMode('monthly')}
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">월간</span>
                  </Button>
                  <Button
                    variant={viewMode === 'quarterly' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => setViewMode('quarterly')}
                  >
                    <CalendarRange className="h-4 w-4" />
                    <span className="hidden sm:inline">분기</span>
                  </Button>
                </div>

                {canManageService && (
                  <Button
                    onClick={() => setIsImporterOpen(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="hidden sm:inline">일괄 등록</span>
                  </Button>
                )}
                {(canManageService || canManageEvents) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">일정 추가</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canManageService && (
                        <DropdownMenuItem
                          onClick={() => setIsServiceDialogOpen(true)}
                          className="cursor-pointer gap-2"
                        >
                          <Music className="h-4 w-4 text-[var(--color-primary-600)]" />
                          예배 일정
                        </DropdownMenuItem>
                      )}
                      {canManageEvents && (
                        <DropdownMenuItem
                          onClick={() => setIsEventDialogOpen(true)}
                          className="cursor-pointer gap-2"
                        >
                          <PartyPopper className="h-4 w-4 text-[var(--color-accent-600)]" />
                          행사 일정
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* 로딩 */}
            {(isLoading || eventsLoading) && (
              <div className="flex justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            )}

            {/* 에러 */}
            {(error || eventsError) && (
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error?.message || eventsError?.message || '일정을 불러오는데 실패했습니다.'}
                </AlertDescription>
              </Alert>
            )}

            {/* 캘린더 */}
            {!isLoading &&
              !eventsLoading &&
              !error &&
              !eventsError &&
              data &&
              (viewMode === 'upcoming' ? (
                <UpcomingCalendar
                  startDate={todayStr}
                  endDate={fiveWeeksLaterStr}
                  schedules={data.data}
                  events={eventsData?.data || []}
                  onRefresh={handleRefresh}
                  onShowPastSchedules={handleShowPastSchedules}
                />
              ) : viewMode === 'monthly' ? (
                <MonthlyCalendar
                  year={year}
                  month={month}
                  schedules={data.data}
                  events={eventsData?.data || []}
                  onRefresh={handleRefresh}
                />
              ) : (
                <QuarterlyCalendar
                  year={year}
                  quarter={quarter}
                  schedules={data.data}
                  events={eventsData?.data || []}
                  onRefresh={handleRefresh}
                />
              ))}
          </div>
        </div>
      </div>

      {/* 예배 일정 추가 다이얼로그 */}
      {canManageService && (
        <ServiceScheduleDialog
          open={isServiceDialogOpen}
          onOpenChange={setIsServiceDialogOpen}
          schedule={null}
          date={null}
          onSuccess={handleRefresh}
        />
      )}

      {/* 행사 일정 추가 다이얼로그 */}
      {canManageEvents && (
        <EventDialog
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          event={null}
          date={null}
          onSuccess={handleRefresh}
        />
      )}

      {/* 일괄 등록 다이얼로그 */}
      {canManageService && (
        <ServiceScheduleImporter
          open={isImporterOpen}
          onOpenChange={setIsImporterOpen}
          onSuccess={handleRefresh}
        />
      )}
    </AppShell>
  );
}
