'use client';

import { AlertTriangle, Calendar, Loader2, Music } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';

import AppShell from '@/components/layout/AppShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { DateNavigator } from '@/components/features/my-attendance/DateNavigator';
import { PracticeVoteSection } from '@/components/features/my-attendance/PracticeVoteSection';
import { ServiceVoteSection } from '@/components/features/my-attendance/ServiceVoteSection';

import { useAttendances, useCreateAttendance, useUpdateAttendance } from '@/hooks/useAttendances';
import { useAuth } from '@/hooks/useAuth';
import { useServiceDateNavigation } from '@/hooks/useServiceDateNavigation';
import { useServiceSchedulesByDate } from '@/hooks/useServiceSchedules';
import {
  formatDeadlineDisplay,
  formatTimeLeft,
  getPracticeDeadline,
  getServiceDeadline,
  isDeadlinePassed,
} from '@/hooks/useVoteDeadlines';
import { createLogger } from '@/lib/logger';
import { showError, showSuccess } from '@/lib/toast';
import { PracticeAttendanceType } from '@/types/database.types';

import type { DeadlineInfo } from '@/components/features/my-attendance/ServiceVoteSection';

const logger = createLogger({ prefix: 'MyAttendancePage' });

export default function MyAttendancePage() {
  const { profile, isMemberLinked, isLoading: authLoading } = useAuth();
  const linkedMemberId = profile?.linked_member_id;

  // 날짜 네비게이션
  const {
    selectedDate,
    hasPrev,
    hasNext,
    goToPrev,
    goToNext,
    relativeLabel,
    isLoading: navLoading,
  } = useServiceDateNavigation();

  // 선택된 날짜의 예배 일정
  const { data: services = [], isLoading: servicesLoading } =
    useServiceSchedulesByDate(selectedDate);

  // 선택된 날짜의 내 출석 데이터
  const { data: myAttendances = [], isLoading: attendancesLoading } = useAttendances({
    member_id: linkedMemberId || undefined,
    date: selectedDate,
  });

  const createMutation = useCreateAttendance();
  const updateMutation = useUpdateAttendance();
  const isMutating = createMutation.isPending || updateMutation.isPending;

  // 예배별 출석 매핑
  const getAttendance = useCallback(
    (serviceId: string) => myAttendances.find((a) => a.service_schedule_id === serviceId),
    [myAttendances]
  );

  // 탭 상태 (예배 2개 이상일 때)
  const [activeTab, setActiveTab] = useState<string>('');
  const currentTab = activeTab || services[0]?.id || '';

  const handleServiceVote = async (serviceId: string, serviceDate: string, value: boolean) => {
    if (!linkedMemberId) return;
    const attendance = getAttendance(serviceId);

    try {
      if (attendance) {
        await updateMutation.mutateAsync({
          id: attendance.id,
          data: { is_service_available: value },
        });
      } else {
        await createMutation.mutateAsync({
          member_id: linkedMemberId,
          date: serviceDate,
          service_schedule_id: serviceId,
          is_service_available: value,
          is_practice_attended: false,
          practice_status: 'ABSENT',
        });
      }
      showSuccess('저장되었습니다.');
    } catch (err) {
      logger.error('투표 저장 실패:', err);
      showError('투표 저장에 실패했습니다.');
    }
  };

  const handlePracticeVote = async (
    serviceId: string,
    serviceDate: string,
    status: PracticeAttendanceType
  ) => {
    if (!linkedMemberId) return;
    const attendance = getAttendance(serviceId);
    const isPracticeAttended = status !== 'ABSENT';

    try {
      if (attendance) {
        await updateMutation.mutateAsync({
          id: attendance.id,
          data: { practice_status: status, is_practice_attended: isPracticeAttended },
        });
      } else {
        await createMutation.mutateAsync({
          member_id: linkedMemberId,
          date: serviceDate,
          service_schedule_id: serviceId,
          is_service_available: true,
          is_practice_attended: isPracticeAttended,
          practice_status: status,
        });
      }
      showSuccess('저장되었습니다.');
    } catch (err) {
      logger.error('연습 참석 투표 저장 실패:', err);
      showError('투표 저장에 실패했습니다.');
    }
  };

  // --- Early returns ---

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!isMemberLinked()) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            먼저 대원 연결이 필요합니다.{' '}
            <Link href="/member-link" className="underline">
              대원 연결 페이지로 이동
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isLoading = navLoading || servicesLoading || attendancesLoading;

  // 마감 정보 계산 헬퍼
  const buildDeadlineInfo = (deadline: Date): DeadlineInfo => {
    const passed = isDeadlinePassed(deadline);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const isUrgent = !passed && diffMs < 60 * 60 * 1000; // 1시간 미만

    return {
      display: formatDeadlineDisplay(deadline),
      timeLeft: formatTimeLeft(deadline),
      isPassed: passed,
      isUrgent,
    };
  };

  // 개별 예배의 투표 UI 렌더링
  const renderServiceVote = (service: (typeof services)[number]) => {
    const attendance = getAttendance(service.id);
    const isAvailable = attendance ? attendance.is_service_available : null;
    const practiceStatus = attendance?.practice_status ?? null;
    const isPracticeAttended = attendance?.is_practice_attended ?? false;

    // 마감시한 계산
    const serviceDeadline = buildDeadlineInfo(getServiceDeadline(service.date));
    const practiceDeadline = service.has_post_practice
      ? buildDeadlineInfo(
          getPracticeDeadline(service.date, service.post_practice_start_time)
        )
      : null;

    return (
      <div className="space-y-5">
        {/* 찬양곡 */}
        {service.hymn_name && (
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-background-secondary)] px-3 py-2.5 shadow-[var(--shadow-xs)] space-y-1.5">
            <div className="text-xs font-medium text-[var(--color-text-tertiary)]">찬양곡</div>
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
              <div className="min-w-0 text-sm">
                <span className="font-medium text-[var(--color-text-primary)]">
                  {service.hymn_name}
                </span>
                {service.composer && (
                  <span className="text-[var(--color-text-tertiary)]">
                    {' · '}{service.composer}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <ServiceVoteSection
          isAvailable={isAvailable}
          onVote={(value) => handleServiceVote(service.id, service.date, value)}
          disabled={isMutating}
          deadline={serviceDeadline}
        />
        {service.has_post_practice && (
          <PracticeVoteSection
            currentStatus={practiceStatus}
            isPracticeAttended={isPracticeAttended}
            onVote={(status) => handlePracticeVote(service.id, service.date, status)}
            disabled={isMutating}
            deadline={practiceDeadline}
          />
        )}
      </div>
    );
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)]">
        <div className="container mx-auto max-w-lg px-4 py-6">
          {/* 날짜 네비게이터 */}
          <div className="mb-5 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-background-primary)] py-3 shadow-[var(--shadow-xs)]">
            <DateNavigator
              selectedDate={selectedDate}
              relativeLabel={
                services.length === 1 && services[0].service_type
                  ? (services[0].service_type as string)
                  : relativeLabel
              }
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPrev={goToPrev}
              onNext={goToNext}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : services.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
              <p className="text-[var(--color-text-secondary)]">
                이 날짜에 등록된 예배 일정이 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 예배 1개면 바로 표시, 2개 이상이면 탭 */}
              {services.length === 1 ? (
                renderServiceVote(services[0])
              ) : (
                <Tabs value={currentTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    {services.map((s) => (
                      <TabsTrigger key={s.id} value={s.id} className="flex-1">
                        {s.service_type as string}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {services.map((s) => (
                    <TabsContent key={s.id} value={s.id} className="mt-4">
                      {renderServiceVote(s)}
                    </TabsContent>
                  ))}
                </Tabs>
              )}

              {/* 간결한 안내 */}
              <p className="text-center text-sm text-[var(--color-text-tertiary)]">
                변경이 필요하면 언제든 다시 투표할 수 있습니다
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
