'use client';

import { AlertTriangle, Calendar, Clock, Loader2, Music, Save } from 'lucide-react';
import { useCallback, useState } from 'react';
import Link from 'next/link';

import AppShell from '@/components/layout/AppShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
import type { PracticeAttendanceType } from '@/types';

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

  // ===== 초안(draft) 상태: 클릭은 선택만 하고, '저장' 버튼으로 명시 저장 =====
  interface VoteDraft {
    isAvailable: boolean | null;
    practiceStatus: PracticeAttendanceType | null;
  }
  // draft는 serviceId 단위로만 존재하며, dirty 상태의 날짜 이동은
  // ConfirmDialog 확인 시 전체 폐기하므로 별도 리셋 이펙트가 필요 없다
  const [drafts, setDrafts] = useState<Record<string, VoteDraft>>({});

  /** 저장된 값 위에 draft를 얹은 현재 표시값 */
  const getDraft = (serviceId: string): VoteDraft => {
    const saved = getAttendance(serviceId);
    return (
      drafts[serviceId] ?? {
        isAvailable: saved ? saved.is_service_available : null,
        practiceStatus: saved?.practice_status ?? null,
      }
    );
  };

  const isDirty = (serviceId: string): boolean => {
    const draft = drafts[serviceId];
    if (!draft) return false;
    const saved = getAttendance(serviceId);
    const savedAvailable = saved ? saved.is_service_available : null;
    const savedPractice = saved?.practice_status ?? null;
    return (
      draft.isAvailable !== savedAvailable ||
      draft.practiceStatus !== savedPractice
    );
  };

  const anyDirty = services.some((s) => isDirty(s.id));

  const setServiceDraft = (serviceId: string, value: boolean) => {
    setDrafts((prev) => ({
      ...prev,
      [serviceId]: { ...getDraft(serviceId), isAvailable: value },
    }));
  };

  const setPracticeDraft = (serviceId: string, status: PracticeAttendanceType) => {
    setDrafts((prev) => ({
      ...prev,
      [serviceId]: { ...getDraft(serviceId), practiceStatus: status },
    }));
  };

  /**
   * 명시적 저장: 등단+연습을 한 번의 mutate로 저장.
   * 부분 마감 시 마감되지 않은 항목만 payload에 포함한다.
   */
  const handleSave = async (
    service: (typeof services)[number],
    serviceOpen: boolean,
    practiceOpen: boolean
  ) => {
    if (!linkedMemberId) return;
    const attendance = getAttendance(service.id);
    const draft = getDraft(service.id);

    // 등단 투표가 열려 있는데 아직 선택하지 않았으면 안내
    if (serviceOpen && draft.isAvailable === null) {
      showError('예배 등단 여부를 선택해주세요.');
      return;
    }

    try {
      if (attendance) {
        const data: Record<string, unknown> = {};
        if (serviceOpen && draft.isAvailable !== null) {
          data.is_service_available = draft.isAvailable;
        }
        if (practiceOpen && draft.practiceStatus !== null) {
          data.practice_status = draft.practiceStatus;
          data.is_practice_attended = draft.practiceStatus !== 'ABSENT';
        }
        await updateMutation.mutateAsync({ id: attendance.id, data });
      } else {
        const practiceStatus =
          practiceOpen && draft.practiceStatus !== null
            ? draft.practiceStatus
            : 'ABSENT';
        await createMutation.mutateAsync({
          member_id: linkedMemberId,
          date: service.date,
          service_schedule_id: service.id,
          ...(serviceOpen && draft.isAvailable !== null
            ? { is_service_available: draft.isAvailable }
            : {}),
          is_practice_attended: practiceStatus !== 'ABSENT',
          practice_status: practiceStatus,
        });
      }
      // 저장 성공 → 초안을 저장값 기준으로 리셋
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[service.id];
        return next;
      });
      showSuccess('투표가 저장되었습니다.');
    } catch (err) {
      logger.error('투표 저장 실패:', err);
      showError(err instanceof Error ? err.message : '투표 저장에 실패했습니다.');
    }
  };

  // 미저장 상태에서 날짜 이동 시 확인
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);
  const guardedNav = (nav: () => void) => {
    if (anyDirty) {
      setPendingNav(() => nav);
    } else {
      nav();
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
    const draft = getDraft(service.id);
    const dirty = isDirty(service.id);

    // 마감시한 계산
    const serviceDeadline = buildDeadlineInfo(getServiceDeadline(service.date));
    const practiceDeadline = service.has_post_practice
      ? buildDeadlineInfo(
          getPracticeDeadline(service.date, service.post_practice_start_time)
        )
      : null;

    const serviceOpen = !serviceDeadline.isPassed;
    const practiceOpen = practiceDeadline ? !practiceDeadline.isPassed : false;
    const allClosed = !serviceOpen && !practiceOpen;
    const isPracticeAttendedDraft =
      draft.practiceStatus !== null && draft.practiceStatus !== 'ABSENT';

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
          isAvailable={draft.isAvailable}
          onVote={(value) => setServiceDraft(service.id, value)}
          disabled={isMutating}
          deadline={serviceDeadline}
        />
        {service.has_post_practice && (
          <PracticeVoteSection
            currentStatus={draft.practiceStatus}
            isPracticeAttended={isPracticeAttendedDraft}
            onVote={(status) => setPracticeDraft(service.id, status)}
            disabled={isMutating}
            deadline={practiceDeadline}
          />
        )}

        {/* 명시적 저장 — 선택은 초안일 뿐, 이 버튼을 눌러야 반영된다 */}
        {allClosed ? (
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-background-secondary)] py-3 text-sm text-[var(--color-text-disabled)]">
            <Clock className="h-4 w-4" />
            투표가 마감되었습니다
          </div>
        ) : (
          <div className="space-y-2">
            {dirty && (
              <p className="text-center text-sm text-[var(--color-warning-600)]">
                저장하지 않은 변경사항이 있습니다
              </p>
            )}
            <button
              type="button"
              onClick={() => handleSave(service, serviceOpen, practiceOpen)}
              disabled={!dirty || isMutating}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary-600)] py-3 text-base font-semibold text-white transition-colors hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:bg-[var(--color-background-tertiary)] disabled:text-[var(--color-text-disabled)]"
            >
              {isMutating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  {attendance ? '수정 내용 저장' : '투표 저장'}
                </>
              )}
            </button>
            {!dirty && attendance && (
              <p className="text-center text-xs text-[var(--color-text-tertiary)]">
                저장된 투표가 있습니다. 선택을 바꾸면 다시 저장할 수 있습니다.
              </p>
            )}
          </div>
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
              onPrev={() => guardedNav(goToPrev)}
              onNext={() => guardedNav(goToNext)}
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
                마감 전까지 자유롭게 수정할 수 있습니다
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 미저장 변경사항이 있을 때 날짜 이동 확인 */}
      <ConfirmDialog
        open={pendingNav !== null}
        onOpenChange={(open) => {
          if (!open) setPendingNav(null);
        }}
        title="저장하지 않은 변경사항"
        description="저장하지 않은 투표 변경사항이 있습니다. 저장하지 않고 이동할까요?"
        onConfirm={() => {
          setDrafts({});
          pendingNav?.();
          setPendingNav(null);
        }}
      />
    </AppShell>
  );
}
