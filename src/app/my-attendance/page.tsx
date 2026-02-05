'use client';

import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  LogIn,
  LogOut,
  Loader2,
  Music,
  XCircle,
} from 'lucide-react';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import AppShell from '@/components/layout/AppShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { useAttendances, useCreateAttendance, useUpdateAttendance } from '@/hooks/useAttendances';
import { useAuth } from '@/hooks/useAuth';
import { useServiceSchedules } from '@/hooks/useServiceSchedules';
import { createLogger } from '@/lib/logger';
import { showError } from '@/lib/toast';
import { PracticeAttendanceType } from '@/types/database.types';

const logger = createLogger({ prefix: 'MyAttendancePage' });

interface UpcomingService {
  id: string; // service_schedule_id
  date: string;
  service_type: string;
  service_start_time: string | null;
  has_post_practice: boolean;
  attendance?: {
    id: string;
    is_service_available: boolean;
    is_practice_attended: boolean;
    practice_status: PracticeAttendanceType | null;
  };
}

// 연습 참석 옵션 정의
const PRACTICE_OPTIONS: {
  value: PracticeAttendanceType;
  label: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  activeClass: string;
}[] = [
  {
    value: 'FULL',
    label: '전체 참석',
    description: '연습 전체 참석',
    icon: <CheckCircle className="h-4 w-4" />,
    colorClass: 'border-green-500 text-green-600',
    activeClass: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
  },
  {
    value: 'EARLY_LEAVE',
    label: '앞부분만',
    description: '조기퇴장 예정',
    icon: <LogOut className="h-4 w-4" />,
    colorClass: 'border-yellow-500 text-yellow-600',
    activeClass: 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500',
  },
  {
    value: 'LATE_JOIN',
    label: '뒷부분만',
    description: '늦게 합류',
    icon: <LogIn className="h-4 w-4" />,
    colorClass: 'border-blue-500 text-blue-600',
    activeClass: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500',
  },
  {
    value: 'ABSENT',
    label: '불참',
    description: '연습 불참',
    icon: <XCircle className="h-4 w-4" />,
    colorClass: 'border-red-500 text-red-600',
    activeClass: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
  },
];

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

  const linkedMemberId = profile?.linked_member_id;

  const { data: myAttendances, isLoading: attendancesLoading } = useAttendances({
    member_id: linkedMemberId || undefined,
    start_date: startDate,
    end_date: endDate,
  });

  const createMutation = useCreateAttendance();
  const updateMutation = useUpdateAttendance();

  // 가장 가까운 주일의 모든 예배를 그룹화
  const upcomingServices = useMemo<UpcomingService[]>(() => {
    if (!schedules?.data || !linkedMemberId) return [];

    const todayDateOnly = new Date(today.toDateString());

    // 오늘 이후의 모든 예배를 날짜순으로 정렬
    const futureSchedules = schedules.data
      .filter((s) => new Date(s.date) >= todayDateOnly)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (futureSchedules.length === 0) return [];

    // 가장 가까운 날짜의 모든 예배
    const nearestDate = futureSchedules[0].date;
    const nearestServices = futureSchedules.filter((s) => s.date === nearestDate);

    return nearestServices.map((service) => {
      // service_schedule_id로 매칭 (date 기반 대신)
      const attendance = myAttendances?.find(
        (a) => a.service_schedule_id === service.id
      );

      return {
        id: service.id,
        date: service.date,
        service_type: service.service_type as string,
        service_start_time: service.service_start_time as string | null,
        has_post_practice: service.has_post_practice ?? true,
        attendance: attendance
          ? {
              id: attendance.id,
              is_service_available: attendance.is_service_available ?? true,
              is_practice_attended: attendance.is_practice_attended ?? false,
              practice_status: attendance.practice_status ?? null,
            }
          : undefined,
      };
    });
  }, [schedules, myAttendances, linkedMemberId, today]);

  // 첫 번째 예배만 기본 펼침
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 첫 번째 예배 자동 펼침 (upcomingServices 변경 시)
  const firstServiceId = upcomingServices[0]?.id;
  useEffect(() => {
    if (firstServiceId) {
      setExpandedIds((prev) => {
        if (prev.size === 0) return new Set([firstServiceId]);
        return prev;
      });
    }
  }, [firstServiceId]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleServiceVote = async (service: UpcomingService, value: boolean) => {
    if (!linkedMemberId) return;

    try {
      if (service.attendance) {
        await updateMutation.mutateAsync({
          id: service.attendance.id,
          data: { is_service_available: value },
        });
      } else {
        await createMutation.mutateAsync({
          member_id: linkedMemberId,
          date: service.date,
          service_schedule_id: service.id,
          is_service_available: value,
          is_practice_attended: false,
          practice_status: 'ABSENT',
        });
      }
    } catch (err) {
      logger.error('투표 저장 실패:', err);
      showError('투표 저장에 실패했습니다.');
    }
  };

  const handlePracticeVote = async (service: UpcomingService, status: PracticeAttendanceType) => {
    if (!linkedMemberId) return;

    // is_practice_attended는 ABSENT가 아니면 true
    const isPracticeAttended = status !== 'ABSENT';

    try {
      if (service.attendance) {
        await updateMutation.mutateAsync({
          id: service.attendance.id,
          data: {
            practice_status: status,
            is_practice_attended: isPracticeAttended,
          },
        });
      } else {
        await createMutation.mutateAsync({
          member_id: linkedMemberId,
          date: service.date,
          service_schedule_id: service.id,
          is_service_available: true,
          is_practice_attended: isPracticeAttended,
          practice_status: status,
        });
      }
    } catch (err) {
      logger.error('연습 참석 투표 저장 실패:', err);
      showError('투표 저장에 실패했습니다.');
    }
  };

  // 로딩 중
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // 대원 연결 안됨
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

  const isLoading = schedulesLoading || attendancesLoading;

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)]">
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <div className="mb-8">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
              <Calendar className="h-6 w-6" />내 출석
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              이번 주일 예배 등단 및 연습 참석 여부를 투표해주세요.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : upcomingServices.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
              <p className="text-[var(--color-text-secondary)]">다가오는 주일 예배 일정이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 날짜 헤더 */}
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4 text-center">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  이번 주일 예배 출석 투표
                </h2>
                <p className="mt-1 text-xl font-medium text-[var(--color-primary)]">
                  {new Date(upcomingServices[0].date).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </p>
              </div>

              {/* 예배별 카드 */}
              {upcomingServices.map((service) => {
                const isExpanded = expandedIds.has(service.id);
                const isMutating = createMutation.isPending || updateMutation.isPending;

                return (
                  <div
                    key={service.id}
                    className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)]"
                  >
                    {/* 예배 헤더 (클릭으로 펼침/접힘) */}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(service.id)}
                      className="flex w-full items-center justify-between p-4 hover:bg-[var(--color-background-tertiary)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-[var(--color-text-secondary)]" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-[var(--color-text-secondary)]" />
                        )}
                        <div className="text-left">
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {service.service_type}
                          </span>
                          {service.service_start_time && (
                            <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
                              ({String(service.service_start_time).slice(0, 5)})
                            </span>
                          )}
                        </div>
                      </div>
                      {/* 투표 상태 뱃지 */}
                      {service.attendance && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          service.attendance.is_service_available
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {service.attendance.is_service_available ? '등단 가능' : '등단 불가'}
                        </span>
                      )}
                    </button>

                    {/* 펼쳐진 내용 */}
                    {isExpanded && (
                      <div className="border-t border-[var(--color-border)] p-4 space-y-4">
                        {/* 등단 가능 여부 */}
                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-tertiary)] p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-[var(--color-primary)]" />
                            <span className="font-medium text-[var(--color-text-primary)]">
                              예배 등단 가능 여부
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={
                                service.attendance?.is_service_available !== false
                                  ? 'default'
                                  : 'outline'
                              }
                              onClick={() => handleServiceVote(service, true)}
                              disabled={isMutating}
                              className={
                                service.attendance?.is_service_available !== false
                                  ? 'flex-1 bg-green-600 hover:bg-green-700'
                                  : 'flex-1'
                              }
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              가능
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                service.attendance?.is_service_available === false
                                  ? 'default'
                                  : 'outline'
                              }
                              onClick={() => handleServiceVote(service, false)}
                              disabled={isMutating}
                              className={
                                service.attendance?.is_service_available === false
                                  ? 'flex-1 bg-red-600 hover:bg-red-700'
                                  : 'flex-1'
                              }
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              불가
                            </Button>
                          </div>
                        </div>

                        {/* 연습 참석 여부 (has_post_practice인 경우에만) */}
                        {service.has_post_practice && (
                          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-tertiary)] p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <Music className="h-5 w-5 text-[var(--color-primary)]" />
                              <span className="font-medium text-[var(--color-text-primary)]">
                                예배 후 연습 참석 여부
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {PRACTICE_OPTIONS.map((option) => {
                                const currentStatus = service.attendance?.practice_status;
                                const isSelected = currentStatus === option.value ||
                                  (currentStatus === null &&
                                    ((option.value === 'ABSENT' && !service.attendance?.is_practice_attended) ||
                                     (option.value === 'FULL' && service.attendance?.is_practice_attended)));

                                return (
                                  <Button
                                    key={option.value}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePracticeVote(service, option.value)}
                                    disabled={isMutating}
                                    className={`flex flex-col items-center justify-center gap-1 py-3 ${
                                      isSelected ? option.activeClass : option.colorClass
                                    }`}
                                  >
                                    <span className="flex items-center gap-1">
                                      {option.icon}
                                      {option.label}
                                    </span>
                                    <span className={`text-xs ${isSelected ? 'text-white/80' : 'opacity-70'}`}>
                                      {option.description}
                                    </span>
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 안내 문구 */}
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4">
                <h3 className="mb-2 font-medium text-[var(--color-text-primary)]">안내</h3>
                <ul className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                  <li>• 등단 가능 여부와 연습 참석 여부를 미리 투표해주세요.</li>
                  <li>• 변경이 필요하면 언제든 다시 투표할 수 있습니다.</li>
                  <li>• 선택하지 않으면 등단은 &quot;가능&quot;, 연습은 &quot;불참&quot;으로 처리됩니다.</li>
                  <li>• 연습에 부분 참석하는 경우 &quot;앞부분만&quot; 또는 &quot;뒷부분만&quot;을 선택해주세요.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
