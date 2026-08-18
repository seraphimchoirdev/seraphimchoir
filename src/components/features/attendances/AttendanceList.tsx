'use client';

import { Part } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns/format';
import { ko } from 'date-fns/locale/ko';
import { ChevronsDown, ChevronsUp, Lock, LockKeyhole, RotateCcw, Save } from 'lucide-react';
import { CheckCheck, ChevronDown, ChevronRight, XCircle } from 'lucide-react';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAttendances } from '@/hooks/useAttendances';
import { useAttendanceMode } from '@/hooks/useAttendanceMode';
import { useAuth } from '@/hooks/useAuth';
import { useMembers } from '@/hooks/useMembers';
import { useUserPart } from '@/hooks/useUserPart';

import type { DeadlinesResponse } from '@/hooks/useAttendanceDeadlines';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/client';
import { showError, showSuccess, showWarning } from '@/lib/toast';
import { cn, getPartLabel } from '@/lib/utils';

import { Database } from '@/types/database.types';

import AttendanceFilters from './AttendanceFilters';
import AttendanceSummary from './AttendanceSummary';
import MemberChip from './MemberChip';
import PracticeSetChip from './PracticeSetChip';

const logger = createLogger({ prefix: 'AttendanceList' });

interface AttendanceListProps {
  date: Date;
  serviceScheduleId?: string;
  deadlines?: DeadlinesResponse;
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

export default function AttendanceList({ date, serviceScheduleId, deadlines }: AttendanceListProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { profile } = useAuth();
  const { userPart, isLoading: isPartLoading } = useUserPart();
  const queryClient = useQueryClient();


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

  // 신입대원(NEW)도 함께 조회한다. 신입은 등단하지 않지만 연습 참석을 기록해야
  // 세트(전연습+후연습)가 쌓이고, 그 기록이 정대원 승격의 근거가 된다.
  // 신입을 빼면 출석 레코드 자체가 생기지 않아 승격 판단 재료가 없다.
  const { data: membersData, isLoading: membersLoading } = useMembers({
    member_status: ['REGULAR', 'NEW'],
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

  // 신입대원 id 집합. 렌더 루프와 저장 payload 양쪽에서 "이 사람이 신입인가"를
  // 물어보는데, 매번 members를 훑으면 O(n²)가 된다.
  const newMemberIds = useMemo(
    () => new Set(members.filter((m) => m.member_status === 'NEW').map((m) => m.id)),
    [members]
  );

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
  //
  // 신입대원은 등단 탭에서 항상 false다. 등단 자체를 하지 않으므로 DB 기본값인
  // true를 그대로 쓰면 "등단 예정"으로 표시되고, 저장 시 잘못된 이력이 남는다.
  // 연습 탭은 신입도 정상 참여하므로 기존 로직을 그대로 쓴다.
  const getMemberAttendingStatus = useCallback(
    (memberId: string): boolean => {
      if (currentField === 'is_service_available' && newMemberIds.has(memberId)) {
        return false;
      }
      const pending = pendingChanges[memberId];
      const attendance = attendances?.find((a) => a.member_id === memberId);
      const dbValue = attendance?.[currentField] ?? true;
      const pendingValue = pending?.[currentField];
      return pendingValue !== undefined ? pendingValue : dbValue;
    },
    [pendingChanges, attendances, currentField, newMemberIds]
  );

  // 파트별 통계 계산
  //
  // 등단 탭에서는 신입을 분모에서도 뺀다. 신입은 등단 대상이 아니므로 분모에 넣으면
  // 파트 헤더가 매주 "12/14명 · 2명 불참"으로 보이고, 파트장이 있지도 않은 불참자를
  // 찾게 된다. 연습 탭에서는 신입도 참석 대상이라 그대로 센다.
  const countedMembersByPart = useMemo(() => {
    if (activeTab !== 'service' || newMemberIds.size === 0) return membersByPart;

    return Object.fromEntries(
      Object.entries(membersByPart).map(([part, partMembers]) => [
        part,
        partMembers.filter((m) => !newMemberIds.has(m.id)),
      ])
    );
  }, [membersByPart, activeTab, newMemberIds]);

  const partStats = useMemo(() => {
    return PARTS.map((part) => {
      const partMembers = countedMembersByPart[part] || [];
      const attendingCount = partMembers.filter((member) =>
        getMemberAttendingStatus(member.id)
      ).length;

      return {
        part,
        total: partMembers.length,
        attending: attendingCount,
      };
    }).filter((stat) => stat.total > 0);
  }, [countedMembersByPart, getMemberAttendingStatus]);

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
      // countedMembersByPart를 쓴다 — 등단 탭에서 신입은 항상 "불참"이라
      // membersByPart 기준으로 세면 신입이 있는 파트가 매번 자동으로 펼쳐진다.
      const partMembers = countedMembersByPart[part] || [];
      const hasAbsent = partMembers.some((m) => !getMemberAttendingStatus(m.id));
      newOpenParts[part] = hasAbsent;
    });
    setOpenParts(newOpenParts);
  }, [isLoading, countedMembersByPart, attendances, getMemberAttendingStatus]);

  // 필터링된 멤버
  //
  // "불참자만" 필터에서도 신입은 남긴다. 신입 행은 등단 여부가 아니라 연습 세트를
  // 기록하는 자리이므로, 불참자를 훑는 중에도 전/후연습 체크는 계속 할 수 있어야 한다.
  const filteredMembersByPart = useMemo(() => {
    if (!showAbsentOnly) return membersByPart;

    return Object.fromEntries(
      Object.entries(membersByPart).map(([part, partMembers]) => [
        part,
        partMembers.filter(
          (member) => newMemberIds.has(member.id) || !getMemberAttendingStatus(member.id)
        ),
      ])
    );
  }, [membersByPart, getMemberAttendingStatus, showAbsentOnly, newMemberIds]);

  // 해당 파트가 준비완료 상태인지 확인
  const isPartReadinessLocked = useCallback(
    (part: string): boolean => {
      return deadlines?.partDeadlines?.[part as Part] !== null &&
        deadlines?.partDeadlines?.[part as Part] !== undefined;
    },
    [deadlines]
  );

  // 잠금 상태별 경고 메시지
  const getLockedWarningMessage = useCallback(() => {
    return deadlines?.hasArrangement
      ? '자리배치표 생성 이후 출석 수정은 지휘자에게 별도 보고해주세요.'
      : '준비 완료 해제 후에 수정해주세요.';
  }, [deadlines?.hasArrangement]);

  // 출석 상태 변경 핸들러
  const handleToggle = useCallback(
    (memberId: string, memberPart: string) => {
      if (isPartReadinessLocked(memberPart)) {
        showWarning(getLockedWarningMessage());
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
    [getMemberAttendingStatus, currentField, isPartReadinessLocked, getLockedWarningMessage]
  );

  // 신입대원의 예배 전 연습 참석 상태 (미기록 = null)
  const getPrePracticeStatus = useCallback(
    (memberId: string): boolean | null => {
      const pending = pendingChanges[memberId];
      if (pending && 'pre_practice_attended' in pending) {
        return pending.pre_practice_attended ?? null;
      }
      const attendance = attendances?.find((a) => a.member_id === memberId);
      return attendance?.pre_practice_attended ?? null;
    },
    [pendingChanges, attendances]
  );

  // 전연습 토글 — 미기록 → 참석 → 불참 → 미기록 순환
  //
  // 2상태(참석/불참) 토글이 아닌 이유: 전연습은 DEFAULT가 NULL이고 "아직 확인 안 됨"과
  // "불참"이 다른 의미다. 잘못 누른 것을 미기록으로 되돌릴 수 없으면, 파트장이 오조작을
  // 정정할 방법이 없어 세트 집계가 틀어진 채로 남는다.
  //
  // handleToggle과 합치지 않은 이유: handleToggle은 currentField(탭에 종속)로 동작하는데
  // 전연습은 탭과 무관하게 항상 기록 가능해야 한다. 옵셔널 인자로 분기시키면 기존
  // 정대원 저장 경로까지 함께 흔들린다.
  const handlePrePracticeToggle = useCallback(
    (memberId: string, memberPart: string) => {
      if (isPartReadinessLocked(memberPart)) {
        showWarning(getLockedWarningMessage());
        return;
      }
      const current = getPrePracticeStatus(memberId);
      const next = current === null ? true : current === true ? false : null;

      setPendingChanges((prev) => ({
        ...prev,
        [memberId]: {
          ...(prev[memberId] || {}),
          pre_practice_attended: next,
        },
      }));
    },
    [getPrePracticeStatus, isPartReadinessLocked, getLockedWarningMessage]
  );

  // 신입 행의 후연습 토글 — 등단 탭에서도 눌러야 하므로 currentField를 안 쓰고
  // is_practice_attended를 직접 지정한다. 저장 경로는 정대원과 완전히 동일하다.
  const handlePostPracticeToggle = useCallback(
    (memberId: string, memberPart: string) => {
      if (isPartReadinessLocked(memberPart)) {
        showWarning(getLockedWarningMessage());
        return;
      }
      const pending = pendingChanges[memberId];
      const attendance = attendances?.find((a) => a.member_id === memberId);
      const current = pending?.is_practice_attended ?? attendance?.is_practice_attended ?? true;

      setPendingChanges((prev) => ({
        ...prev,
        [memberId]: {
          ...(prev[memberId] || {}),
          is_practice_attended: !current,
        },
      }));
    },
    [pendingChanges, attendances, isPartReadinessLocked, getLockedWarningMessage]
  );

  // 파트 전체 선택/해제 핸들러
  const handleSelectAllPart = useCallback(
    (part: string, value: boolean) => {
      if (isPartReadinessLocked(part)) {
        showWarning(getLockedWarningMessage());
        return;
      }
      // 등단 탭의 "전체 출석"이 신입까지 true로 만들면 안 된다 — 신입은 등단하지 않는다.
      // countedMembersByPart는 등단 탭에서 이미 신입을 제외한 목록이다.
      const partMembers = countedMembersByPart[part] || [];

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
    [countedMembersByPart, currentField, isPartReadinessLocked, getLockedWarningMessage]
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
    setIsSubmitting(true);
    try {
      // 화면에 표시된 전체 멤버(파트장은 본인 파트)의 현재 상태를 모두 기록한다.
      // 변경분(pendingChanges)만 저장하면 기본 true로 표시된 등단자가 DB에 남지 않아
      // 마이페이지 최근 등단일·출석 통계가 부정확해진다. 전체 스냅샷을 upsert해
      // "레코드 없음=등단" 암묵 규약을 명시적 레코드로 확정한다.
      const visibleMembers = Object.values(membersByPart).flat();

      const payload = visibleMembers.map((member) => {
        const memberId = member.id;
        const changes = pendingChanges[memberId];
        const existing = attendances?.find((a) => a.member_id === memberId);
        const isNewMember = newMemberIds.has(memberId);

        // 표시 우선순위: 사용자 변경 > 기존 DB 값 > 기본 true(등단/연습 가능)
        //
        // 신입대원만 예외로 false를 명시 전송한다. 신입은 등단하지 않으므로 기존
        // 우선순위(기본 true)를 그대로 태우면 손대지 않아도 매주 등단으로 기록되고,
        // 승격 후에야 "신입일 때도 매주 등단했다"는 잘못된 이력으로 드러난다.
        // zod의 .default(true)에 의존하지 않고 값을 직접 보낸다.
        const is_service_available = isNewMember
          ? false
          : (changes?.is_service_available ?? existing?.is_service_available ?? true);

        const is_practice_attended =
          changes?.is_practice_attended ?? existing?.is_practice_attended ?? true;

        // 전연습 값은 신입 여부와 무관하게 **항상** 보낸다(미기록이면 null).
        // 입력은 신입 행에서만 하지만, 전송은 전원이 한다.
        //
        // 조건부로 키를 빼면 안 되는 이유 — PostgREST는 배열 upsert를 행별로 처리하지
        // 않는다. 합집합 컬럼으로 INSERT 하나를 만든 뒤 ON CONFLICT DO UPDATE SET
        // col = EXCLUDED.col을 건다. 키가 빠진 행에는 DEFAULT(= NULL)가 채워지므로
        // 그 행의 기존 값이 지워진다(로컬 DB에서 재현 확인).
        //
        // 그래서 두 가지가 깨진다:
        //   1. 신입 A만 체크해도 같은 payload의 신입 B 기록이 NULL이 된다
        //   2. 승격된 대원은 newMemberIds에서 빠져 키를 안 보내게 되는데, 그 순간
        //      신입 시절의 세트 기록이 전부 지워진다 — 승격 근거가 사라진다
        //
        // 화면이 계산한 값(기존 DB 값 폴백 포함)을 항상 실으면 덮어써도 같은 값이라
        // 무해하다. is_service_available이 이미 쓰는 스냅샷 규약과 동일하다.
        const pre_practice_attended = getPrePracticeStatus(memberId);

        return {
          member_id: memberId,
          date: dateStr,
          service_schedule_id: serviceScheduleId,
          is_service_available,
          is_practice_attended,
          pre_practice_attended,
        };
      });

      if (payload.length === 0) {
        setIsSubmitting(false);
        return;
      }

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

  // 화면에 보이는 멤버 중 이 예배에 아직 출석 레코드가 없는 사람이 있는지
  // (전원 등단이라 아무도 토글하지 않아도 첫 저장으로 등단 기록을 남길 수 있어야 함)
  const hasUnsavedMembers = useMemo(() => {
    const visibleMembers = Object.values(membersByPart).flat();
    return visibleMembers.some(
      (member) => !attendances?.some((a) => a.member_id === member.id)
    );
  }, [membersByPart, attendances]);

  const hasChanges = Object.keys(pendingChanges).length > 0 || hasUnsavedMembers;

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
              예배 등단
            </TabsTrigger>
            <TabsTrigger value="practice">예배 후 연습</TabsTrigger>
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

              // 신입은 별도 블록으로 렌더링한다(칩 그리드에 넣으면 칩 두 개가 뭉갠다)
              const partRegulars = partMembers.filter((m) => !newMemberIds.has(m.id));
              const partNewMembers = partMembers.filter((m) => newMemberIds.has(m.id));

              // 파트 헤더의 "n/N명 · n명 불참"은 등단 인원 기준이다.
              // countedMembersByPart는 등단 탭에서 신입이 빠진 목록이라 여기에 맞다.
              const countedPartMembers = countedMembersByPart[part] || [];
              const partAttendingCount = countedPartMembers.filter((m) =>
                getMemberAttendingStatus(m.id)
              ).length;
              const partAbsentCount = countedPartMembers.length - partAttendingCount;

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
                        {partAttendingCount}/{countedPartMembers.length}명
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

                        {/* 칩 그리드 (정대원) */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                          {partRegulars.map((member) => {
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

                        {/* 신입대원 — 그리드가 아니라 전체 너비 행으로 쌓는다.
                            이름 + 전연습 + 후연습 세 요소가 좁은 그리드 셀에서는 뭉개지고,
                            신입은 파트당 0~2명이라 세로로 쌓아도 공간을 거의 안 먹는다. */}
                        {partNewMembers.length > 0 && (
                          <div className="space-y-2 rounded-lg border border-dashed border-[var(--color-border-default)] bg-[var(--color-background-secondary)] p-3">
                            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                              신입대원 · 연습 세트 기록
                            </p>
                            {partNewMembers.map((member) => {
                              const isRowDisabled = isPartReadinessLocked(member.part);
                              const attendance = attendances?.find((a) => a.member_id === member.id);
                              const pending = pendingChanges[member.id];

                              const preValue = getPrePracticeStatus(member.id);
                              const preChanged =
                                pending !== undefined &&
                                'pre_practice_attended' in pending &&
                                (pending.pre_practice_attended ?? null) !==
                                  (attendance?.pre_practice_attended ?? null);

                              // 후연습은 기존 boolean 필드를 그대로 쓴다(정대원과 동일한 저장 경로).
                              // 다만 신입 행에서는 탭과 무관하게 항상 보여야 하므로 값을 직접 계산한다.
                              const postDbValue = attendance?.is_practice_attended ?? true;
                              const postValue = pending?.is_practice_attended ?? postDbValue;
                              const postChanged =
                                pending?.is_practice_attended !== undefined &&
                                pending.is_practice_attended !== postDbValue;

                              return (
                                <div
                                  key={member.id}
                                  className="flex flex-wrap items-center gap-2"
                                  data-testid="new-member-row"
                                  data-member-id={member.id}
                                >
                                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                                    <span className="truncate">{member.name}</span>
                                    <span className="flex-shrink-0 rounded-full bg-[var(--color-primary-100)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary-700)]">
                                      신입
                                    </span>
                                  </span>

                                  <div className="ml-auto flex items-center gap-1.5">
                                    <PracticeSetChip
                                      label="전연습"
                                      value={preValue}
                                      isChanged={preChanged}
                                      disabled={isRowDisabled}
                                      onToggle={() =>
                                        handlePrePracticeToggle(member.id, member.part)
                                      }
                                    />
                                    {/* 후연습이 없는 예배에서는 세트가 성립하지 않으므로 칩도 숨긴다 */}
                                    {hasPostPractice && (
                                      <PracticeSetChip
                                        label="후연습"
                                        value={postValue}
                                        isChanged={postChanged}
                                        disabled={isRowDisabled}
                                        onToggle={() =>
                                          handlePostPracticeToggle(member.id, member.part)
                                        }
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

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
                            <LockKeyhole className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
                            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                              {deadlines?.hasArrangement
                                ? '자리배치표 생성 이후 출석 수정은 지휘자에게 별도 보고해주세요.'
                                : '준비 완료 해제 후에 수정해주세요.'}
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
                data-testid="attendance-save"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <Spinner size="sm" className="mr-1.5" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                {Object.keys(pendingChanges).length > 0
                  ? `저장 (${Object.keys(pendingChanges).length}건)`
                  : '전체 저장'}
              </Button>
            </div>
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
