'use client';

import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  LogIn,
  LogOut,
  Loader2,
  Music,
  XCircle,
} from 'lucide-react';

import { useMemo } from 'react';

import AppShell from '@/components/layout/AppShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { useAttendances, useCreateAttendance, useUpdateAttendance } from '@/hooks/useAttendances';
import { useAuth } from '@/hooks/useAuth';
import { useServiceSchedules } from '@/hooks/useServiceSchedules';
import {
  getServiceDeadline,
  getPracticeDeadline,
  isDeadlinePassed,
  getTimeUntilDeadline,
} from '@/hooks/useVoteDeadlines';

import { createLogger } from '@/lib/logger';
import { showError } from '@/lib/toast';
import { PracticeAttendanceType } from '@/types/database.types';

const logger = createLogger({ prefix: 'MyAttendancePage' });

interface NextSundayService {
  date: string;
  service_type: string;
  serviceDeadline: Date;
  practiceDeadline: Date;
  isServiceDeadlinePassed: boolean;
  isPracticeDeadlinePassed: boolean;
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
  });

  const createMutation = useCreateAttendance();
  const updateMutation = useUpdateAttendance();

  // 가장 가까운 주일 2부 예배만 필터링
  const nextSundayService = useMemo<NextSundayService | null>(() => {
    if (!schedules?.data || !linkedMemberId) return null;

    const todayDateOnly = new Date(today.toDateString());

    // 주일 2부 예배 중 가장 가까운 것
    const nextService = schedules.data
      .filter((s) => s.service_type === '주일 2부 예배')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .find((s) => new Date(s.date) >= todayDateOnly);

    if (!nextService) return null;

    const attendance = myAttendances?.find((a) => a.date === nextService.date);
    const serviceDeadline = getServiceDeadline(nextService.date);
    const practiceDeadline = getPracticeDeadline(nextService.date);

    return {
      date: nextService.date,
      service_type: nextService.service_type as string,
      serviceDeadline,
      practiceDeadline,
      isServiceDeadlinePassed: isDeadlinePassed(serviceDeadline),
      isPracticeDeadlinePassed: isDeadlinePassed(practiceDeadline),
      attendance: attendance
        ? {
            id: attendance.id,
            is_service_available: attendance.is_service_available ?? true,
            is_practice_attended: attendance.is_practice_attended ?? false,
            practice_status: attendance.practice_status ?? null,
          }
        : undefined,
    };
  }, [schedules, myAttendances, linkedMemberId, today]);

  const handleServiceVote = async (value: boolean) => {
    if (!linkedMemberId || !nextSundayService) return;

    if (nextSundayService.isServiceDeadlinePassed) {
      showError('투표 마감 시간이 지났습니다.');
      return;
    }

    try {
      if (nextSundayService.attendance) {
        await updateMutation.mutateAsync({
          id: nextSundayService.attendance.id,
          data: { is_service_available: value },
        });
      } else {
        await createMutation.mutateAsync({
          member_id: linkedMemberId,
          date: nextSundayService.date,
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

  const handlePracticeVote = async (status: PracticeAttendanceType) => {
    if (!linkedMemberId || !nextSundayService) return;

    if (nextSundayService.isPracticeDeadlinePassed) {
      showError('투표 마감 시간이 지났습니다.');
      return;
    }

    // is_practice_attended는 ABSENT가 아니면 true
    const isPracticeAttended = status !== 'ABSENT';

    try {
      if (nextSundayService.attendance) {
        await updateMutation.mutateAsync({
          id: nextSundayService.attendance.id,
          data: {
            practice_status: status,
            is_practice_attended: isPracticeAttended,
          },
        });
      } else {
        await createMutation.mutateAsync({
          member_id: linkedMemberId,
          date: nextSundayService.date,
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
            <a href="/member-link" className="underline">
              대원 연결 페이지로 이동
            </a>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isLoading = schedulesLoading || attendancesLoading;

  // 마감 시간 포맷팅 함수
  const formatDeadline = (deadline: Date) => {
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][deadline.getDay()];
    const hours = deadline.getHours().toString().padStart(2, '0');
    const minutes = deadline.getMinutes().toString().padStart(2, '0');
    return `${dayOfWeek}요일 ${hours}:${minutes}`;
  };

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
          ) : !nextSundayService ? (
            <div className="py-12 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
              <p className="text-[var(--color-text-secondary)]">다가오는 주일 예배 일정이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 예배 정보 헤더 */}
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-6">
                <div className="mb-4 text-center">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    이번 주일 예배 출석 투표
                  </h2>
                  <p className="mt-1 text-xl font-medium text-[var(--color-primary)]">
                    {new Date(nextSundayService.date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                    })}{' '}
                    주일 2부예배
                  </p>
                </div>

                {/* 등단 가능 여부 */}
                <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-tertiary)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[var(--color-primary)]" />
                    <span className="font-medium text-[var(--color-text-primary)]">
                      예배 등단 가능 여부
                    </span>
                  </div>

                  <div className="mb-3 flex items-center gap-1 text-sm text-[var(--color-text-tertiary)]">
                    <Clock className="h-4 w-4" />
                    <span>
                      마감: {formatDeadline(nextSundayService.serviceDeadline)}
                      {nextSundayService.isServiceDeadlinePassed && (
                        <span className="ml-2 text-red-500">(마감됨)</span>
                      )}
                    </span>
                  </div>

                  {!nextSundayService.isServiceDeadlinePassed && (
                    <div className="mb-3 text-xs text-[var(--color-text-tertiary)]">
                      {(() => {
                        const timeUntil = getTimeUntilDeadline(
                          nextSundayService.serviceDeadline.toISOString()
                        );
                        if (timeUntil.isPassed) return null;
                        return (
                          <span>
                            마감까지 {timeUntil.days > 0 && `${timeUntil.days}일 `}
                            {timeUntil.hours}시간 {timeUntil.minutes}분 남음
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={
                        nextSundayService.attendance?.is_service_available !== false
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() => handleServiceVote(true)}
                      disabled={
                        nextSundayService.isServiceDeadlinePassed ||
                        createMutation.isPending ||
                        updateMutation.isPending
                      }
                      className={
                        nextSundayService.attendance?.is_service_available !== false
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
                        nextSundayService.attendance?.is_service_available === false
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() => handleServiceVote(false)}
                      disabled={
                        nextSundayService.isServiceDeadlinePassed ||
                        createMutation.isPending ||
                        updateMutation.isPending
                      }
                      className={
                        nextSundayService.attendance?.is_service_available === false
                          ? 'flex-1 bg-red-600 hover:bg-red-700'
                          : 'flex-1'
                      }
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      불가
                    </Button>
                  </div>
                </div>

                {/* 연습 참석 여부 */}
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-tertiary)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Music className="h-5 w-5 text-[var(--color-primary)]" />
                    <span className="font-medium text-[var(--color-text-primary)]">
                      예배 후 연습 참석 여부
                    </span>
                  </div>

                  <div className="mb-3 flex items-center gap-1 text-sm text-[var(--color-text-tertiary)]">
                    <Clock className="h-4 w-4" />
                    <span>
                      마감: {formatDeadline(nextSundayService.practiceDeadline)}
                      {nextSundayService.isPracticeDeadlinePassed && (
                        <span className="ml-2 text-red-500">(마감됨)</span>
                      )}
                    </span>
                  </div>

                  {!nextSundayService.isPracticeDeadlinePassed && (
                    <div className="mb-3 text-xs text-[var(--color-text-tertiary)]">
                      {(() => {
                        const timeUntil = getTimeUntilDeadline(
                          nextSundayService.practiceDeadline.toISOString()
                        );
                        if (timeUntil.isPassed) return null;
                        return (
                          <span>
                            마감까지 {timeUntil.days > 0 && `${timeUntil.days}일 `}
                            {timeUntil.hours}시간 {timeUntil.minutes}분 남음
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {PRACTICE_OPTIONS.map((option) => {
                      // 현재 선택된 상태 확인 (practice_status가 없으면 is_practice_attended로 추정)
                      const currentStatus = nextSundayService.attendance?.practice_status;
                      const isSelected = currentStatus === option.value ||
                        // practice_status가 없을 때 is_practice_attended로 추정
                        (currentStatus === null &&
                          ((option.value === 'ABSENT' && !nextSundayService.attendance?.is_practice_attended) ||
                           (option.value === 'FULL' && nextSundayService.attendance?.is_practice_attended)));

                      return (
                        <Button
                          key={option.value}
                          size="sm"
                          variant="outline"
                          onClick={() => handlePracticeVote(option.value)}
                          disabled={
                            nextSundayService.isPracticeDeadlinePassed ||
                            createMutation.isPending ||
                            updateMutation.isPending
                          }
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
              </div>

              {/* 안내 문구 */}
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4">
                <h3 className="mb-2 font-medium text-[var(--color-text-primary)]">안내</h3>
                <ul className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                  <li>• 등단 가능 여부는 토요일 15:00까지 투표해주세요.</li>
                  <li>• 연습 참석 여부는 주일 09:00까지 투표해주세요.</li>
                  <li>• 마감 후에는 파트장이나 관리자에게 문의해주세요.</li>
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
