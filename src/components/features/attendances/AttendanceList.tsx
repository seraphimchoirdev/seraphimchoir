'use client';

import { Part } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns/format';
import { ko } from 'date-fns/locale/ko';
import { Check, ChevronsDown, ChevronsUp, Lock, LockKeyhole, RotateCcw, Save } from 'lucide-react';
import { CheckCheck, ChevronDown, ChevronRight, XCircle } from 'lucide-react';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAttendances } from '@/hooks/useAttendances';
import { useAttendanceMode } from '@/hooks/useAttendanceMode';
import { useAuth } from '@/hooks/useAuth';
import { useMembers } from '@/hooks/useMembers';

import type { DeadlinesResponse } from '@/hooks/useAttendanceDeadlines';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/client';
import { showError, showSuccess, showWarning } from '@/lib/toast';
import { cn, getPartLabel, getTestAccountPart, isTestAccount } from '@/lib/utils';

import { Database } from '@/types/database.types';

import AttendanceFilters from './AttendanceFilters';
import AttendanceSummary from './AttendanceSummary';
import MemberChip from './MemberChip';

const logger = createLogger({ prefix: 'AttendanceList' });

interface AttendanceListProps {
  date: Date;
  serviceScheduleId?: string;
  deadlines?: DeadlinesResponse;
  onMarkReady?: (part: Part) => Promise<void>;
}

// Supabase Database 타입 사용
type Attendance = Database['public']['Tables']['attendances']['Row'];

const PARTS: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];

// 파트별 그라데이션 배경색 (악보 스티커 색상 기준 - 자리배치와 통일)
const partGradients: Record<Part, string> = {
  SOPRANO: 'from-[var(--color-part-soprano-50)] to-[var(--color-part-soprano-100)]/50',
  ALTO: 'from-[var(--color-part-alto-50)] to-[var(--color-part-alto-100)]/50',
  TENOR: 'from-[var(--color-part-tenor-50)] to-[var(--color-part-tenor-100)]/50',
  BASS: 'from-[var(--color-part-bass-50)] to-[var(--color-part-bass-100)]/50',
  SPECIAL: 'from-[var(--color-part-special-50)] to-[var(--color-part-special-100)]/50',
};

const partAccentColors: Record<Part, string> = {
  SOPRANO: 'text-[var(--color-part-soprano-700)]',
  ALTO: 'text-[var(--color-part-alto-700)]',
  TENOR: 'text-[var(--color-part-tenor-700)]',
  BASS: 'text-[var(--color-part-bass-700)]',
  SPECIAL: 'text-[var(--color-part-special-700)]',
};

export default function AttendanceList({ date, serviceScheduleId, deadlines, onMarkReady }: AttendanceListProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { profile, user } = useAuth();
  const [userPart, setUserPart] = useState<string | null>(null);
  const [isPartLoading, setIsPartLoading] = useState(false);
  const queryClient = useQueryClient();

  // 저장 후 준비완료 제안 상태
  const [showReadinessPrompt, setShowReadinessPrompt] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const readinessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (readinessTimerRef.current) clearTimeout(readinessTimerRef.current);
    };
  }, []);

  // 해당 예배의 has_post_practice 조회
  const [hasPostPractice, setHasPostPractice] = useState<boolean>(true);
  useEffect(() => {
    if (!serviceScheduleId) {
      setHasPostPractice(true); // 기본값
      return;
    }
    const supabase = createClient();
    supabase
      .from('service_schedules')
      .select('has_post_practice')
      .eq('id', serviceScheduleId)
      .single()
      .then(({ data }) => {
        setHasPostPractice(data?.has_post_practice ?? true);
      });
  }, [serviceScheduleId]);

  // 출석 관리 모드 및 잠금 상태
  const { mode, defaultTab, lockStatus, isLoading: isModeLoading } = useAttendanceMode({ date, serviceScheduleId });

  // 파트장인 경우 본인 파트 확인
  useEffect(() => {
    async function fetchUserPart() {
      if (profile?.role === 'PART_LEADER' && user?.email) {
        setIsPartLoading(true);

        // 테스트 계정인 경우 이메일에서 파트 추출
        if (isTestAccount(user.email)) {
          const testPart = getTestAccountPart(user.email);
          if (testPart) setUserPart(testPart);
          setIsPartLoading(false);
          return;
        }

        // 실제 계정인 경우 user_profiles.linked_member_id를 통해 연결된 멤버의 파트 조회
        const supabase = createClient();
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('linked_member_id, members:linked_member_id(part)')
          .eq('id', user.id)
          .single();

        // Supabase JOIN 결과는 단일 객체 또는 배열일 수 있음
        const membersResult = profileData?.members;
        let partValue: string | null = null;

        if (Array.isArray(membersResult) && membersResult.length > 0) {
          partValue = (membersResult[0] as { part: string })?.part ?? null;
        } else if (membersResult && typeof membersResult === 'object' && 'part' in membersResult) {
          partValue = (membersResult as { part: string }).part;
        }

        if (partValue) {
          setUserPart(partValue);
        }
        setIsPartLoading(false);
      }
    }
    fetchUserPart();
  }, [profile, user]);

  const { data: membersData, isLoading: membersLoading } = useMembers({
    member_status: 'REGULAR',
    is_singer: true, // 등단자만 (지휘자/반주자 제외)
    limit: 100,
    sortBy: 'name', // 가나다순 정렬 (중장년층 UX 개선)
    sortOrder: 'asc',
  });

  const { data: attendances, isLoading: attendancesLoading } = useAttendances({
    date: dateStr,
    service_schedule_id: serviceScheduleId,
  });

  // 활성 탭: 모드에 따라 자동 설정 (both 모드에서는 시간 기반 defaultTab 사용)
  const [activeTab, setActiveTab] = useState<'service' | 'practice'>(() => {
    if (mode === 'both') return defaultTab;
    if (mode === 'practice') return 'practice';
    return 'service';
  });
  const [showAbsentOnly, setShowAbsentOnly] = useState(false);

  // 모드 변경 시 activeTab 자동 조정
  // 연습이 없는 예배(has_post_practice=false)에서는 practice 탭으로 전환하지 않음
  // deps에서 activeTab 제거: 무한 루프 방지 (setActiveTab → 리렌더 → effect 재실행 방지)
  useEffect(() => {
    if (!hasPostPractice) {
      setActiveTab('service');
    } else if (mode === 'both') {
      setActiveTab(defaultTab);
    } else if (mode === 'service-entry') {
      setActiveTab('service');
    } else if (mode === 'practice' && hasPostPractice) {
      setActiveTab('practice');
    }
  }, [mode, defaultTab, hasPostPractice]);

  // 변경사항 추적 상태
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<Attendance>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);

  // serviceScheduleId 변경 시 pending changes 초기화
  useEffect(() => {
    setPendingChanges({});
  }, [serviceScheduleId]);

  // 파트별 열림/닫힘 상태
  const [openParts, setOpenParts] = useState<Record<Part, boolean>>({
    SOPRANO: true,
    ALTO: true,
    TENOR: true,
    BASS: true,
    SPECIAL: true,
  });

  const isLoading =
    membersLoading ||
    attendancesLoading ||
    isModeLoading ||
    (profile?.role === 'PART_LEADER' && isPartLoading);

  const members = useMemo(() => membersData?.data || [], [membersData?.data]);

  // 파트별로 멤버 그룹화
  const membersByPart = useMemo(() => {
    return members.reduce(
      (acc, member) => {
        if (profile?.role === 'PART_LEADER' && userPart && member.part !== userPart) {
          return acc;
        }
        const part = member.part;
        if (!acc[part]) {
          acc[part] = [];
        }
        acc[part].push(member);
        return acc;
      },
      {} as Record<string, typeof members>
    );
  }, [members, profile?.role, userPart]);

  // 현재 탭의 필드명
  const currentField = activeTab === 'service' ? 'is_service_available' : 'is_practice_attended';

  // 멤버의 출석 상태 계산
  const getMemberAttendingStatus = useCallback(
    (memberId: string): boolean => {
      const pending = pendingChanges[memberId];
      const attendance = attendances?.find((a) => a.member_id === memberId);
      const dbValue = attendance?.[currentField] ?? true;
      const pendingValue = pending?.[currentField];
      return pendingValue !== undefined ? pendingValue : dbValue;
    },
    [pendingChanges, attendances, currentField]
  );

  // 파트별 통계 계산
  const partStats = useMemo(() => {
    return PARTS.map((part) => {
      const partMembers = membersByPart[part] || [];
      const attendingCount = partMembers.filter((member) =>
        getMemberAttendingStatus(member.id)
      ).length;

      return {
        part,
        total: partMembers.length,
        attending: attendingCount,
      };
    }).filter((stat) => stat.total > 0);
  }, [membersByPart, getMemberAttendingStatus]);

  // 전체 통계
  const totalStats = useMemo(() => {
    const total = partStats.reduce((sum, s) => sum + s.total, 0);
    const attending = partStats.reduce((sum, s) => sum + s.attending, 0);
    return { total, attending };
  }, [partStats]);

  const absentCount = totalStats.total - totalStats.attending;

  // 스마트 기본값: 불참자 있는 파트만 자동 열림
  useEffect(() => {
    if (isLoading) return;

    const newOpenParts: Record<Part, boolean> = {} as Record<Part, boolean>;
    PARTS.forEach((part) => {
      const partMembers = membersByPart[part] || [];
      const hasAbsent = partMembers.some((m) => !getMemberAttendingStatus(m.id));
      newOpenParts[part] = hasAbsent;
    });
    setOpenParts(newOpenParts);
  }, [isLoading, membersByPart, attendances, getMemberAttendingStatus]);

  // 필터링된 멤버
  const filteredMembersByPart = useMemo(() => {
    if (!showAbsentOnly) return membersByPart;

    return Object.fromEntries(
      Object.entries(membersByPart).map(([part, partMembers]) => [
        part,
        partMembers.filter((member) => !getMemberAttendingStatus(member.id)),
      ])
    );
  }, [membersByPart, getMemberAttendingStatus, showAbsentOnly]);

  // 해당 파트가 준비완료 상태인지 확인
  const isPartReadinessLocked = useCallback(
    (part: string): boolean => {
      return deadlines?.partDeadlines?.[part as Part] !== null &&
        deadlines?.partDeadlines?.[part as Part] !== undefined;
    },
    [deadlines]
  );

  // 출석 상태 변경 핸들러
  const handleToggle = useCallback(
    (memberId: string, memberPart: string) => {
      if (isPartReadinessLocked(memberPart)) {
        showWarning('준비 완료 해제 후에 수정해주세요.');
        return;
      }
      const currentValue = getMemberAttendingStatus(memberId);
      setPendingChanges((prev) => {
        const memberChanges = prev[memberId] || {};
        return {
          ...prev,
          [memberId]: {
            ...memberChanges,
            [currentField]: !currentValue,
          },
        };
      });
    },
    [getMemberAttendingStatus, currentField, isPartReadinessLocked]
  );

  // 파트 전체 선택/해제 핸들러
  const handleSelectAllPart = useCallback(
    (part: string, value: boolean) => {
      if (isPartReadinessLocked(part)) {
        showWarning('준비 완료 해제 후에 수정해주세요.');
        return;
      }
      const partMembers = membersByPart[part] || [];

      setPendingChanges((prev) => {
        const updates = { ...prev };
        partMembers.forEach((member) => {
          updates[member.id] = {
            ...(updates[member.id] || {}),
            [currentField]: value,
          };
        });
        return updates;
      });
    },
    [membersByPart, currentField, isPartReadinessLocked]
  );

  // 파트 토글 핸들러
  const handlePartToggle = useCallback((part: Part) => {
    setOpenParts((prev) => ({ ...prev, [part]: !prev[part] }));
  }, []);

  // 전체 펼치기/접기
  const handleExpandAll = useCallback(() => {
    setOpenParts(Object.fromEntries(PARTS.map((p) => [p, true])) as Record<Part, boolean>);
  }, []);

  const handleCollapseAll = useCallback(() => {
    setOpenParts(Object.fromEntries(PARTS.map((p) => [p, false])) as Record<Part, boolean>);
  }, []);

  // 변경사항 저장
  const handleSubmit = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    setIsSubmitting(true);
    try {
      const payload = Object.entries(pendingChanges).map(([memberId, changes]) => {
        const existing = attendances?.find((a) => a.member_id === memberId);

        const is_service_available =
          changes.is_service_available ?? existing?.is_service_available ?? true;

        const is_practice_attended =
          changes.is_practice_attended ?? existing?.is_practice_attended ?? true;

        return {
          member_id: memberId,
          date: dateStr,
          service_schedule_id: serviceScheduleId,
          is_service_available,
          is_practice_attended,
        };
      });

      const res = await fetch('/api/attendances/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendances: payload }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save attendances');
      }

      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      showSuccess('저장되었습니다.');

      // 저장 성공 후 준비완료 제안 조건 확인
      if (
        userPart &&
        profile?.role === 'PART_LEADER' &&
        deadlines?.partDeadlines?.[userPart as Part] === null
      ) {
        setShowReadinessPrompt(true);
        if (readinessTimerRef.current) clearTimeout(readinessTimerRef.current);
        readinessTimerRef.current = setTimeout(() => setShowReadinessPrompt(false), 5000);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      logger.error('Failed to save attendances:', error);
      showError(`저장 실패: ${errorMessage}`, handleSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetClick = () => {
    setResetDialog(true);
  };

  const handleReset = () => {
    setPendingChanges({});
    setResetDialog(false);
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-background-primary)] py-4">
        <h3 className="text-lg font-semibold">
          {format(date, 'M월 d일 (E)', { locale: ko })} 출석 체크
        </h3>
      </div>

      {/* 요약 프로그레스 바 */}
      <AttendanceSummary
        totalCount={totalStats.total}
        attendingCount={totalStats.attending}
        partStats={partStats}
      />

      {/* 필터 + 펼치기/접기 버튼 */}
      <div className="flex flex-col gap-2">
        <AttendanceFilters
          showAbsentOnly={showAbsentOnly}
          onShowAbsentOnlyChange={setShowAbsentOnly}
          absentCount={absentCount}
        />
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExpandAll}
            className="h-7 px-2 text-xs text-[var(--color-text-secondary)]"
          >
            <ChevronsDown className="mr-1 h-4 w-4" />
            모두 펼치기
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapseAll}
            className="h-7 px-2 text-xs text-[var(--color-text-secondary)]"
          >
            <ChevronsUp className="mr-1 h-4 w-4" />
            모두 접기
          </Button>
        </div>
      </div>

      {/* 모드 안내 메시지 */}
      {mode !== 'both' && (
        <Alert className="border-[var(--color-primary-200)] bg-[var(--color-primary-50)]">
          <AlertDescription className="text-sm text-[var(--color-primary-700)]">
            {mode === 'service-entry' && (
              <>
                <strong>주중 출석 관리 모드</strong>입니다. 예배 등단 출석 현황을 관리하세요.
                <br />
                예배 후 연습 출석은 <strong>주일 당일 오전 9시 이후</strong>부터 입력 가능합니다.
              </>
            )}
            {mode === 'practice' && (
              <>
                <strong>예배 당일 출석 관리 모드</strong>입니다. 예배 후 연습 참석 현황을 관리하세요.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 잠금 경고 메시지 */}
      {lockStatus.isServiceEntryLocked && mode === 'both' && (
        <Alert variant="warning">
          <Lock className="h-4 w-4" />
          <AlertDescription>{lockStatus.lockReason}</AlertDescription>
        </Alert>
      )}

      {/* 탭 */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'service' | 'practice')}
        className="w-full"
      >
        {/* 탭 리스트: both 모드이고 연습이 있을 때만 표시 */}
        {mode === 'both' && hasPostPractice && (
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="service">
              {lockStatus.isServiceEntryLocked && <Lock className="mr-1.5 h-3.5 w-3.5" />}
              예배 등단 (주중 파악)
            </TabsTrigger>
            <TabsTrigger value="practice">예배 후 연습 (주일 당일)</TabsTrigger>
          </TabsList>
        )}

        {['service', 'practice'].map((tabValue) => {
          // 연습이 없는 예배에서는 practice 탭을 표시하지 않음
          if (tabValue === 'practice' && !hasPostPractice) return null;

          // 현재 모드에서 이 탭을 표시해야 하는지 체크
          const shouldShowTab =
            mode === 'both' ||
            (mode === 'service-entry' && tabValue === 'service') ||
            (mode === 'practice' && tabValue === 'practice');

          if (!shouldShowTab) return null;

          // 이 탭이 잠겨있는지 체크
          const isTabLocked =
            tabValue === 'service' && lockStatus.isServiceEntryLocked;

          return (
            <TabsContent key={tabValue} value={tabValue} className="space-y-3">
              {PARTS.map((part) => {
                const partMembers = filteredMembersByPart[part] || [];
                const allPartMembers = membersByPart[part] || [];

              if (allPartMembers.length === 0) return null;

              const partAttendingCount = allPartMembers.filter((m) =>
                getMemberAttendingStatus(m.id)
              ).length;
              const partAbsentCount = allPartMembers.length - partAttendingCount;

              const isExpanded = openParts[part];

              return (
                <div
                  key={part}
                  className="overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] shadow-sm"
                >
                  {/* 파트 헤더 */}
                  <button
                    type="button"
                    onClick={() => handlePartToggle(part)}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-3',
                      'bg-gradient-to-r transition-colors duration-200',
                      partGradients[part],
                      'hover:brightness-95 focus:ring-2 focus:ring-[var(--color-primary-300)] focus:outline-none focus:ring-inset'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className={cn('h-5 w-5', partAccentColors[part])} />
                      ) : (
                        <ChevronRight className={cn('h-5 w-5', partAccentColors[part])} />
                      )}
                      <span className={cn('font-bold', partAccentColors[part])}>
                        {getPartLabel(part)}
                      </span>
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {partAttendingCount}/{allPartMembers.length}명
                      </span>
                    </div>

                    {partAbsentCount > 0 ? (
                      <span className="rounded-full bg-[var(--color-error-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-error-700)]">
                        {partAbsentCount}명 불참
                      </span>
                    ) : (
                      <span className="rounded-full bg-[var(--color-success-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-success-700)]">
                        전원출석
                      </span>
                    )}
                  </button>

                  {/* 펼쳐진 내용 */}
                  {isExpanded && (
                    <div className="relative bg-[var(--color-background-primary)] p-4">
                      <div className={cn('space-y-3', isPartReadinessLocked(part) && 'blur-[2px] select-none')}>
                        {/* 빠른 액션 버튼들 */}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAllPart(part, true);
                            }}
                            disabled={isTabLocked || isPartReadinessLocked(part)}
                            className="h-auto px-2.5 py-1 text-xs text-[var(--color-success-600)] hover:bg-[var(--color-success-100)] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            전체 출석
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAllPart(part, false);
                            }}
                            disabled={isTabLocked || isPartReadinessLocked(part)}
                            className="h-auto px-2.5 py-1 text-xs text-[var(--color-text-tertiary)] hover:bg-[var(--color-border-subtle)] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            전체 불참
                          </Button>
                        </div>

                        {/* 칩 그리드 */}
                        <div className="flex flex-wrap gap-2">
                          {partMembers.map((member) => {
                            const attendance = attendances?.find((a) => a.member_id === member.id);
                            const dbValue =
                              tabValue === 'service'
                                ? (attendance?.is_service_available ?? true)
                                : (attendance?.is_practice_attended ?? true);
                            const pending = pendingChanges[member.id];
                            const pendingValue =
                              tabValue === 'service'
                                ? pending?.is_service_available
                                : pending?.is_practice_attended;
                            const isAttending = pendingValue !== undefined ? pendingValue : dbValue;
                            const isChanged = pendingValue !== undefined && pendingValue !== dbValue;

                            return (
                              <MemberChip
                                key={member.id}
                                member={{
                                  id: member.id,
                                  name: member.name,
                                  part: member.part as Part,
                                  is_leader: member.is_leader ?? false,
                                }}
                                isAttending={isAttending}
                                isChanged={isChanged}
                                disabled={isTabLocked || isPartReadinessLocked(member.part)}
                                onToggle={() => handleToggle(member.id, member.part)}
                              />
                            );
                          })}
                        </div>

                        {/* 불참자 필터 시 해당 파트에 불참자가 없을 때 */}
                        {showAbsentOnly && partMembers.length === 0 && partAbsentCount === 0 && (
                          <div className="py-4 text-center text-sm text-[var(--color-text-tertiary)]">
                            이 파트는 전원 출석입니다
                          </div>
                        )}
                      </div>

                      {/* 준비완료 잠금 오버레이 */}
                      {isPartReadinessLocked(part) && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center">
                          <div className="flex items-center gap-2 rounded-lg bg-[var(--color-background-primary)]/90 px-4 py-2 shadow-sm">
                            <LockKeyhole className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                              준비 완료 해제 후에 수정해주세요.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 접힌 상태에서 미니 프리뷰 */}
                  {!isExpanded && partAbsentCount > 0 && (
                    <div className="border-t border-[var(--color-border-default)] bg-[var(--color-background-secondary)] px-4 py-2">
                      <p className="text-xs text-[var(--color-text-tertiary)]">
                        불참:{' '}
                        {allPartMembers
                          .filter((m) => !getMemberAttendingStatus(m.id))
                          .map((m) => m.name)
                          .slice(0, 5)
                          .join(', ')}
                        {partAbsentCount > 5 && ` 외 ${partAbsentCount - 5}명`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

              {/* 필터 적용 시 결과가 없을 때 */}
              {showAbsentOnly && absentCount === 0 && (
                <div className="py-8 text-center text-[var(--color-text-secondary)]">
                  모든 대원이 출석으로 체크되어 있습니다.
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* 하단 고정 플로팅 저장 버튼 */}
      {hasChanges && (
        <div className="animate-in slide-in-from-bottom-4 fixed right-0 bottom-20 left-0 z-40 px-4 duration-300 lg:bottom-6">
          <div className="mx-auto flex max-w-lg flex-col gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-3 shadow-lg">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetClick}
                disabled={isSubmitting}
                className="flex-shrink-0"
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <Spinner size="sm" className="mr-1.5" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                저장 ({Object.keys(pendingChanges).length}건)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 저장 후 준비완료 제안 플로팅 바 */}
      {showReadinessPrompt && !hasChanges && userPart && (
        <div className="animate-in slide-in-from-bottom-4 fixed right-0 bottom-20 left-0 z-40 px-4 duration-300 lg:bottom-6">
          <div className="mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-[var(--color-success-200)] bg-[var(--color-success-50)] p-3 shadow-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowReadinessPrompt(false);
                if (readinessTimerRef.current) clearTimeout(readinessTimerRef.current);
              }}
              className="flex-shrink-0 text-[var(--color-text-secondary)]"
            >
              나중에
            </Button>
            <Button
              size="sm"
              disabled={isMarkingReady}
              onClick={async () => {
                setIsMarkingReady(true);
                try {
                  await onMarkReady?.(userPart as Part);
                  setShowReadinessPrompt(false);
                  if (readinessTimerRef.current) clearTimeout(readinessTimerRef.current);
                } finally {
                  setIsMarkingReady(false);
                }
              }}
              className="flex-1 bg-[var(--color-success-600)] text-white hover:bg-[var(--color-success-700)]"
            >
              {isMarkingReady ? (
                <Spinner size="sm" className="mr-1.5" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              {getPartLabel(userPart as Part)} 준비완료
            </Button>
          </div>
        </div>
      )}

      {/* 변경사항 취소 확인 다이얼로그 */}
      <ConfirmDialog
        open={resetDialog}
        onOpenChange={setResetDialog}
        title="변경사항 취소"
        description="변경사항을 모두 취소하시겠습니까?"
        confirmLabel="취소하기"
        variant="destructive"
        onConfirm={handleReset}
      />
    </div>
  );
}
