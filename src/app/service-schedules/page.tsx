'use client';

import { useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { QuarterSelector, QuarterlyCalendar, ServiceScheduleDialog, ServiceScheduleImporter } from '@/components/features/service-schedules';
import EventDialog from '@/components/features/service-schedules/EventDialog';
import { useServiceSchedules } from '@/hooks/useServiceSchedules';
import { useChoirEvents } from '@/hooks/useChoirEvents';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertCircle, Plus, FileSpreadsheet, Music, PartyPopper } from 'lucide-react';

export default function ServiceSchedulesPage() {
  const { hasRole, isLoading: authLoading } = useAuth();

  // 일정 조회 권한: 모든 역할
  const hasPermission = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'STAFF', 'PART_LEADER', 'MEMBER']);
  // 예배 일정 관리 권한: ADMIN, CONDUCTOR, MANAGER만
  const canManageService = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER']);
  // 행사 일정 관리 권한: 현재는 ADMIN, CONDUCTOR, MANAGER만 (향후 대원 승인제 도입 예정)
  const canManageEvents = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER']);

  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [quarter, setQuarter] = useState(
    Math.ceil((currentDate.getMonth() + 1) / 3)
  );

  // 예배 일정 추가 다이얼로그 상태
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);

  // 행사 일정 추가 다이얼로그 상태
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  // 일괄 등록 다이얼로그 상태
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  const { data, isLoading, error, refetch } = useServiceSchedules({
    year,
    quarter,
  });

  // 행사 데이터 조회
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useChoirEvents({
    year,
    quarter,
  });

  // 예배 일정과 행사 모두 refetch
  const handleRefresh = useCallback(() => {
    refetch();
    refetchEvents();
  }, [refetch, refetchEvents]);

  if (authLoading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[var(--color-background-tertiary)] flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (!hasPermission) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[var(--color-background-tertiary)]">
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Alert variant="error">
              <AlertDescription>
                찬양대 일정 페이지에 접근할 권한이 없습니다.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)]">

      <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 헤더 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                찬양대 일정 관리
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                분기별 예배 및 행사 일정을 관리합니다
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
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
                      <DropdownMenuItem onClick={() => setIsServiceDialogOpen(true)} className="gap-2 cursor-pointer">
                        <Music className="h-4 w-4 text-[var(--color-primary-600)]" />
                        예배 일정
                      </DropdownMenuItem>
                    )}
                    {canManageEvents && (
                      <DropdownMenuItem onClick={() => setIsEventDialogOpen(true)} className="gap-2 cursor-pointer">
                        <PartyPopper className="h-4 w-4 text-[var(--color-accent-600)]" />
                        행사 일정
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <QuarterSelector
                year={year}
                quarter={quarter}
                onChange={(y, q) => {
                  setYear(y);
                  setQuarter(q);
                }}
              />
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
          {!isLoading && !eventsLoading && !error && !eventsError && data && (
            <QuarterlyCalendar
              year={year}
              quarter={quarter}
              schedules={data.data}
              events={eventsData?.data || []}
              onRefresh={handleRefresh}
            />
          )}
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
