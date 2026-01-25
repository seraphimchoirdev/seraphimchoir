'use client';

import {
  AlertCircle,
  Calendar,
  CalendarRange,
  FileSpreadsheet,
  Music,
  PartyPopper,
  Plus,
} from 'lucide-react';

import { useCallback, useState } from 'react';

import {
  MonthSelector,
  MonthlyCalendar,
  QuarterSelector,
  QuarterlyCalendar,
  ServiceScheduleDialog,
  ServiceScheduleImporter,
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

type ViewMode = 'monthly' | 'quarterly';

export default function ServiceSchedulesPage() {
  const { hasRole, isLoading: authLoading } = useAuth();

  // 일정 조회 권한: 모든 역할
  const hasPermission = hasRole([
    'ADMIN',
    'CONDUCTOR',
    'MANAGER',
    'STAFF',
    'PART_LEADER',
    'MEMBER',
  ]);
  // 예배 일정 관리 권한: ADMIN, CONDUCTOR, MANAGER만
  const canManageService = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER']);
  // 행사 일정 관리 권한: 현재는 ADMIN, CONDUCTOR, MANAGER만 (향후 대원 승인제 도입 예정)
  const canManageEvents = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER']);

  const currentDate = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [quarter, setQuarter] = useState(Math.ceil((currentDate.getMonth() + 1) / 3));

  // 예배 일정 추가 다이얼로그 상태
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);

  // 행사 일정 추가 다이얼로그 상태
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  // 일괄 등록 다이얼로그 상태
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // 뷰 모드에 따른 필터 설정
  const scheduleFilters = viewMode === 'monthly' ? { year, month } : { year, quarter };

  const { data, isLoading, error, refetch } = useServiceSchedules(scheduleFilters);

  // 행사 데이터 조회
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useChoirEvents(scheduleFilters);

  // 예배 일정과 행사 모두 refetch
  const handleRefresh = useCallback(() => {
    refetch();
    refetchEvents();
  }, [refetch, refetchEvents]);

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
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {viewMode === 'monthly' ? '월별' : '분기별'} 예배 및 행사 일정을 관리합니다
              </p>
            </div>

            {/* 컨트롤 영역 */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              {/* 좌측: 날짜 선택기 */}
              <div>
                {viewMode === 'monthly' ? (
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
                {/* 뷰 전환 토글 */}
                <div className="flex items-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-background-secondary)] p-0.5">
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
              (viewMode === 'monthly' ? (
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
