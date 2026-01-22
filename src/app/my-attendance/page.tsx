'use client';

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAttendances, useCreateAttendance, useUpdateAttendance } from '@/hooks/useAttendances';
import { useServiceSchedules } from '@/hooks/useServiceSchedules';
import { useUpcomingVoteDeadlines, getTimeUntilDeadline } from '@/hooks/useVoteDeadlines';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'MyAttendancePage' });

interface ServiceWithAttendance {
  date: string;
  service_type: string;
  deadline?: {
    deadline_at: string;
    is_passed: boolean;
  };
  attendance?: {
    id: string;
    is_service_available: boolean;
  };
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  SUNDAY_1: '주일 1부',
  SUNDAY_2: '주일 2부',
  SUNDAY_3: '주일 3부',
  WEDNESDAY: '수요예배',
  FRIDAY: '금요예배',
  SPECIAL: '특별예배',
};

export default function MyAttendancePage() {
  const { profile, isMemberLinked, isLoading: authLoading } = useAuth();

  // 다가오는 예배 일정 (앞으로 4주)
  const today = new Date();
  const fourWeeksLater = new Date(today);
  fourWeeksLater.setDate(today.getDate() + 28);

  const startDate = today.toISOString().split('T')[0];
  const endDate = fourWeeksLater.toISOString().split('T')[0];

  const { data: schedules, isLoading: schedulesLoading } = useServiceSchedules({
    startDate,
    endDate,
  });

  const { data: deadlines, isLoading: deadlinesLoading } = useUpcomingVoteDeadlines(10);

  const linkedMemberId = profile?.linked_member_id;

  const { data: myAttendances, isLoading: attendancesLoading } = useAttendances({
    member_id: linkedMemberId || undefined,
  });

  const createMutation = useCreateAttendance();
  const updateMutation = useUpdateAttendance();

  // 예배 일정과 출석/마감 정보 결합 (useMemo로 계산)
  const upcomingServices = useMemo<ServiceWithAttendance[]>(() => {
    if (!schedules?.data || !linkedMemberId) return [];

    return schedules.data
      .filter((schedule) => schedule.service_type !== null) // service_type이 null인 경우 제외
      .map((schedule) => {
        const deadline = deadlines?.find(d => d.service_date === schedule.date);
        const attendance = myAttendances?.find(a => a.date === schedule.date);

        return {
          date: schedule.date,
          service_type: schedule.service_type as string, // null이 아님이 보장됨
          deadline: deadline ? {
            deadline_at: deadline.deadline_at,
            is_passed: deadline.is_passed,
          } : undefined,
          attendance: attendance ? {
            id: attendance.id,
            is_service_available: attendance.is_service_available ?? true,
          } : undefined,
        };
      });
  }, [schedules, deadlines, myAttendances, linkedMemberId]);

  const handleToggleAttendance = async (service: ServiceWithAttendance, newValue: boolean) => {
    if (!linkedMemberId) return;

    // 마감된 경우 수정 불가
    if (service.deadline?.is_passed) {
      return;
    }

    try {
      if (service.attendance) {
        // 기존 출석 수정
        await updateMutation.mutateAsync({
          id: service.attendance.id,
          data: {
            is_service_available: newValue,
          },
        });
      } else {
        // 새 출석 생성
        await createMutation.mutateAsync({
          member_id: linkedMemberId,
          date: service.date,
          is_service_available: newValue,
        });
      }
    } catch (err) {
      logger.error('출석 업데이트 실패:', err);
    }
  };

  // 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // 대원 연결 안됨
  if (!isMemberLinked()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            먼저 대원 연결이 필요합니다.{' '}
            <a href="/member-link" className="underline">대원 연결 페이지로 이동</a>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isLoading = schedulesLoading || deadlinesLoading || attendancesLoading;

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)]">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            내 출석
          </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          다가오는 예배의 등단 가능 여부를 선택해주세요.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : upcomingServices.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-[var(--color-text-tertiary)] mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            다가오는 예배 일정이 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {upcomingServices.map((service) => {
            const isAvailable = service.attendance?.is_service_available ?? true;
            const isPassed = service.deadline?.is_passed ?? false;
            const timeUntil = service.deadline
              ? getTimeUntilDeadline(service.deadline.deadline_at)
              : null;

            return (
              <div
                key={`${service.date}-${service.service_type}`}
                className={`border rounded-lg p-4 ${
                  isPassed
                    ? 'border-[var(--color-border)] bg-[var(--color-background-tertiary)] opacity-60'
                    : 'border-[var(--color-border)] bg-[var(--color-background-secondary)]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {new Date(service.date).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </span>
                      <span className="text-sm px-2 py-0.5 rounded-full bg-[var(--color-background-tertiary)] text-[var(--color-text-secondary)]">
                        {SERVICE_TYPE_LABELS[service.service_type] || service.service_type}
                      </span>
                    </div>

                    {/* 마감 시간 표시 */}
                    {service.deadline && (
                      <div className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                        <Clock className="h-3 w-3" />
                        {isPassed ? (
                          <span className="text-red-500">마감됨</span>
                        ) : timeUntil ? (
                          <span>
                            마감까지{' '}
                            {timeUntil.days > 0 && `${timeUntil.days}일 `}
                            {timeUntil.hours}시간 {timeUntil.minutes}분
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* 등단 가능 여부 토글 */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={isAvailable ? 'default' : 'outline'}
                      onClick={() => handleToggleAttendance(service, true)}
                      disabled={isPassed || createMutation.isPending || updateMutation.isPending}
                      className={isAvailable ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      가능
                    </Button>
                    <Button
                      size="sm"
                      variant={!isAvailable ? 'default' : 'outline'}
                      onClick={() => handleToggleAttendance(service, false)}
                      disabled={isPassed || createMutation.isPending || updateMutation.isPending}
                      className={!isAvailable ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      불가
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

        {/* 안내 문구 */}
        <div className="mt-8 p-4 bg-[var(--color-background-secondary)] rounded-lg border border-[var(--color-border)]">
          <h3 className="font-medium text-[var(--color-text-primary)] mb-2">안내</h3>
          <ul className="text-sm text-[var(--color-text-secondary)] space-y-1">
            <li>• 마감 시간 전까지 등단 가능 여부를 변경할 수 있습니다.</li>
            <li>• 마감 후에는 파트장이나 관리자에게 문의해주세요.</li>
            <li>• 선택하지 않으면 기본적으로 &quot;가능&quot;으로 처리됩니다.</li>
          </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
