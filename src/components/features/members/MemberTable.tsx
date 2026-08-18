'use client';
'use memo';

import { addMonths } from 'date-fns/addMonths';
import { differenceInDays } from 'date-fns/differenceInDays';
import { differenceInMonths } from 'date-fns/differenceInMonths';
import { format } from 'date-fns/format';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Eye,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';

import { memo, useCallback, useMemo, useState } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  type MemberPracticeSetProgress,
  useMemberPracticeSets,
} from '@/hooks/useMemberPracticeSets';
import { useDeleteMember, useUpdateMember } from '@/hooks/useMembers';

import { createLogger } from '@/lib/logger';
import { showError, showSuccess } from '@/lib/toast';

import type { Database } from '@/types/database.types';

import MemberAvatar from './MemberAvatar';

const logger = createLogger({ prefix: 'MemberTable' });

type Member = Database['public']['Tables']['members']['Row'] & {
  last_service_date?: string | null;
  last_practice_date?: string | null;
};
type Part = Database['public']['Enums']['part'];
type MemberStatus = Database['public']['Enums']['member_status'];

/**
 * 출석일 기준 색상 스타일 반환
 * - 2주일 이내: 초록 (정상)
 * - 1개월 이내: 기본
 * - 1-2개월: 노랑 (주의)
 * - 2-3개월: 주황 (경고)
 * - 3개월 이상: 빨강 (위험)
 */
const getAttendanceDateStyle = (
  dateStr: string | null | undefined
): { textClass: string; showWarning: boolean } => {
  if (!dateStr) {
    return { textClass: 'text-neutral-400', showWarning: false };
  }

  const daysSince = differenceInDays(new Date(), new Date(dateStr));

  if (daysSince <= 14) {
    return { textClass: 'text-[var(--color-success-600)]', showWarning: false };
  }
  if (daysSince <= 30) {
    return { textClass: 'text-neutral-600', showWarning: false };
  }
  if (daysSince <= 60) {
    return { textClass: 'text-[var(--color-warning-600)]', showWarning: false };
  }
  if (daysSince <= 90) {
    return { textClass: 'text-orange-600', showWarning: true };
  }
  return { textClass: 'text-[var(--color-error-600)]', showWarning: true };
};

/**
 * 날짜 포맷팅 (항상 yy.MM.dd 형식)
 */
const formatAttendanceDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'yy.MM.dd');
};

// 휴직 정보 폼 데이터
interface LeaveInfoFormData {
  leave_reason: string;
  leave_start_date: string;
  leave_duration_months: number | null;
  expected_return_date: string;
  showDetails: boolean; // 상세 정보 입력 여부
}

// 복직 처리 정보
interface ReturnFromLeaveInfo {
  memberId: string;
  memberName: string;
  leaveStartDate: string | null;
  leaveDurationDays: number;
  leaveDurationMonths: number;
  requiredPracticeSessions: number;
  targetStatus: MemberStatus;
}

/** 정대원 승격 확인 모달에 넘길 정보. 집계 전이면 completed/required가 null이다. */
interface PromoteInfo {
  memberId: string;
  memberName: string;
  completed: number | null;
  required: number | null;
  isEligible: boolean;
}

/**
 * 휴직 기간에 따른 재등단 조건 계산
 * - 1개월 미만: 2회 연습 참여
 * - 1개월 이상: 4회 연습 참여
 */
const calculateRequiredPracticeSessions = (
  leaveStartDate: string | null
): { days: number; months: number; sessions: number } => {
  if (!leaveStartDate) {
    // 휴직 시작일이 없으면 기본값 (1개월 이상으로 간주)
    return { days: 30, months: 1, sessions: 4 };
  }

  const startDate = new Date(leaveStartDate);
  const today = new Date();
  const days = differenceInDays(today, startDate);
  const months = differenceInMonths(today, startDate);

  // 1개월 미만이면 2회, 1개월 이상이면 4회
  const sessions = months < 1 ? 2 : 4;

  return { days, months, sessions };
};

interface MemberTableProps {
  members: Member[];
  onRefetch?: () => void;
}

// 파트별 색상 (악보 스티커 색상 기준 - 자리배치와 통일)
const PART_COLORS: Partial<Record<Part, { bg: string; text: string; border: string }>> = {
  SOPRANO: {
    bg: 'bg-[var(--color-part-soprano-50)]',
    text: 'text-[var(--color-part-soprano-600)]',
    border: 'border-[var(--color-part-soprano-500)]',
  },
  ALTO: {
    bg: 'bg-[var(--color-part-alto-50)]',
    text: 'text-[var(--color-part-alto-600)]',
    border: 'border-[var(--color-part-alto-500)]',
  },
  TENOR: {
    bg: 'bg-[var(--color-part-tenor-50)]',
    text: 'text-[var(--color-part-tenor-600)]',
    border: 'border-[var(--color-part-tenor-500)]',
  },
  BASS: {
    bg: 'bg-[var(--color-part-bass-50)]',
    text: 'text-[var(--color-part-bass-600)]',
    border: 'border-[var(--color-part-bass-500)]',
  },
};

// 파트명 한글
const PART_LABELS: Partial<Record<Part, string>> = {
  SOPRANO: '소프라노',
  ALTO: '알토',
  TENOR: '테너',
  BASS: '베이스',
};

// 상태명 한글
const STATUS_LABELS: Record<MemberStatus, string> = {
  REGULAR: '정대원',
  NEW: '신입대원',
  ON_LEAVE: '휴직대원',
  RESIGNED: '사직대원',
  GUEST: '게스트',
};

// 상태별 색상 (시맨틱 컬러 - 디자인 시스템 변수 사용)
const STATUS_COLORS: Record<MemberStatus, string> = {
  REGULAR:
    'bg-[var(--color-success-100)] text-[var(--color-success-700)] border-[var(--color-success-200)]',
  NEW: 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border-[var(--color-primary-200)]',
  ON_LEAVE:
    'bg-[var(--color-part-special-100)] text-[var(--color-part-special-700)] border-[var(--color-part-special-200)]',
  RESIGNED:
    'bg-[var(--color-error-100)] text-[var(--color-error-700)] border-[var(--color-error-200)]',
  GUEST:
    'bg-neutral-100 text-neutral-600 border-neutral-300',
};

/**
 * MemberTable 컴포넌트
 * 데스크톱에서 사용하는 테이블 형태의 찬양대원 목록
 */
// 상태 변경 순서 정의 (드롭다운 메뉴 순서)
const STATUS_OPTIONS: MemberStatus[] = ['REGULAR', 'NEW', 'ON_LEAVE', 'RESIGNED', 'GUEST'];

// 개별 테이블 행 컴포넌트 (메모이제이션)
interface MemberRowProps {
  member: Member;
  updatingStatusId: string | null;
  isDeleting: boolean;
  /** 신입대원일 때의 세트 진행 상황. 아직 안 불러왔으면 undefined */
  practiceSetProgress?: MemberPracticeSetProgress;
  onStatusChange: (memberId: string, newStatus: MemberStatus) => void;
  onDeleteClick: (id: string) => void;
}

const MemberRow = memo(function MemberRow({
  member,
  updatingStatusId,
  isDeleting,
  practiceSetProgress,
  onStatusChange,
  onDeleteClick,
}: MemberRowProps) {
  return (
    <tr className="group transition-colors hover:bg-neutral-50">
      {/* 대원 (아바타 + 이름) */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <MemberAvatar name={member.name} part={member.part} />
          <div>
            <div className="text-sm font-medium text-neutral-900">{member.name}</div>
            {member.phone_number && (
              <div className="text-xs text-neutral-500">{member.phone_number}</div>
            )}
          </div>
        </div>
      </td>

      {/* 파트 */}
      <td className="px-4 py-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${PART_COLORS[member.part]?.bg || 'bg-[var(--color-part-special-50)]'} ${PART_COLORS[member.part]?.text || 'text-[var(--color-part-special-600)]'} ${PART_COLORS[member.part]?.border || 'border-[var(--color-part-special-500)]'} `}
        >
          {PART_LABELS[member.part] || member.part}
        </span>
      </td>

      {/* 역할 */}
      <td className="px-4 py-4 whitespace-nowrap">
        {member.is_leader ? (
          <span className="inline-flex items-center rounded-md border border-[var(--color-primary-200)] bg-[var(--color-primary-100)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary-700)]">
            파트장
          </span>
        ) : (
          <span className="text-sm text-[var(--color-text-tertiary)]">대원</span>
        )}
      </td>

      {/* 상태 (드롭다운) */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${STATUS_COLORS[member.member_status]} `}
                disabled={updatingStatusId === member.id}
              >
                {updatingStatusId === member.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                {STATUS_LABELS[member.member_status]}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {/* 휴직대원일 때 복직 옵션 표시 */}
              {member.member_status === 'ON_LEAVE' && (
                <>
                  <DropdownMenuItem
                    onClick={() => onStatusChange(member.id, 'REGULAR')}
                    className="cursor-pointer text-xs font-medium text-[var(--color-success-700)]"
                  >
                    <RotateCcw className="mr-2 h-3 w-3" />
                    복직대원
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {STATUS_OPTIONS.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => {
                    if (status !== member.member_status) {
                      onStatusChange(member.id, status);
                    }
                  }}
                  className={`cursor-pointer text-xs ${status === member.member_status ? 'bg-[var(--color-background-tertiary)] font-semibold' : ''} `}
                >
                  <span
                    className={`mr-2 inline-block h-2 w-2 rounded-full ${status === 'REGULAR' ? 'bg-[var(--color-success-500)]' : ''} ${status === 'NEW' ? 'bg-[var(--color-primary-500)]' : ''} ${status === 'ON_LEAVE' ? 'bg-[var(--color-part-special-500)]' : ''} ${status === 'RESIGNED' ? 'bg-[var(--color-error-500)]' : ''} ${status === 'GUEST' ? 'bg-neutral-400' : ''} `}
                  />
                  {STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* 휴직대원일 때 복직 예정일 표시 */}
          {member.member_status === 'ON_LEAVE' && member.expected_return_date && (
            <span
              className="text-[10px] text-[var(--color-warning-600)]"
              title={member.leave_reason || '휴직 중'}
            >
              복직: {format(new Date(member.expected_return_date), 'yy.MM.dd')}
            </span>
          )}
          {/* 신입대원일 때 연습 세트 진행도 — 승격 판단 근거를 결정이 일어나는 자리에 붙인다 */}
          {member.member_status === 'NEW' && practiceSetProgress && (
            <span
              data-testid="practice-set-progress"
              className={`text-[10px] font-medium ${
                practiceSetProgress.isEligible
                  ? 'text-[var(--color-success-600)]'
                  : 'text-[var(--color-text-tertiary)]'
              }`}
              title={
                practiceSetProgress.isEligible
                  ? '필요한 연습 세트를 채웠습니다'
                  : '전연습+후연습을 모두 참석해야 1세트로 인정됩니다'
              }
            >
              {practiceSetProgress.completed}/{practiceSetProgress.required} 세트
              {practiceSetProgress.isEligible && ' ✓ 승격가능'}
            </span>
          )}
        </div>
      </td>

      {/* 정대원 임명일 */}
      <td className="px-4 py-4 whitespace-nowrap">
        <span className="text-sm text-neutral-600">
          {member.joined_date ? format(new Date(member.joined_date), 'yyyy.MM.dd') : '-'}
        </span>
      </td>

      {/* 최근 등단일 */}
      <td className="px-4 py-4 whitespace-nowrap">
        {(() => {
          const style = getAttendanceDateStyle(member.last_service_date);
          return (
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium ${style.textClass}`}>
                {formatAttendanceDate(member.last_service_date)}
              </span>
              {style.showWarning && <AlertTriangle className="h-3.5 w-3.5 text-current" />}
            </div>
          );
        })()}
      </td>

      {/* 최근 연습 출석일 */}
      <td className="px-4 py-4 whitespace-nowrap">
        {(() => {
          const style = getAttendanceDateStyle(member.last_practice_date);
          return (
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium ${style.textClass}`}>
                {formatAttendanceDate(member.last_practice_date)}
              </span>
              {style.showWarning && <AlertTriangle className="h-3.5 w-3.5 text-current" />}
            </div>
          );
        })()}
      </td>

      {/* 액션 버튼 */}
      <td className="px-4 py-4 text-right text-sm whitespace-nowrap">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Link
            href={`/management/members/${member.id}`}
            className="inline-flex items-center justify-center rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50"
            aria-label="상세보기"
            title="상세보기"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            href={`/management/members/${member.id}/edit`}
            className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100"
            aria-label="수정"
            title="수정"
          >
            <Edit2 className="h-4 w-4" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteClick(member.id)}
            className="text-[var(--color-error-600)] hover:bg-[var(--color-error-50)]"
            aria-label="삭제"
            title="삭제"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
});

export default function MemberTable({ members, onRefetch }: MemberTableProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  // 휴직 정보 모달 상태
  const [leaveModalMemberId, setLeaveModalMemberId] = useState<string | null>(null);
  const [leaveFormData, setLeaveFormData] = useState<LeaveInfoFormData>({
    leave_reason: '',
    leave_start_date: format(new Date(), 'yyyy-MM-dd'),
    leave_duration_months: 3,
    expected_return_date: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
    showDetails: false,
  });
  // 복직 처리 모달 상태
  const [returnModalInfo, setReturnModalInfo] = useState<ReturnFromLeaveInfo | null>(null);
  // 정대원 승격 확인 모달 상태
  const [promoteModalInfo, setPromoteModalInfo] = useState<PromoteInfo | null>(null);

  const deleteMutation = useDeleteMember();
  const updateMutation = useUpdateMember();

  // 신입대원 연습 세트 진행도.
  //
  // 목록에 신입이 하나도 없으면 조회하지 않는다. 정대원만 있는 파트를 보고 있을 때
  // 쓰이지도 않을 집계를 매번 부르지 않기 위해서다.
  const hasNewMembers = useMemo(
    () => members.some((m) => m.member_status === 'NEW'),
    [members]
  );
  const { data: practiceSetsData } = useMemberPracticeSets(hasNewMembers);
  const practiceSetProgressById = practiceSetsData?.data;

  // 삭제 대상 멤버 메모이제이션
  const memberToDelete = useMemo(() => {
    if (!deleteConfirmId) return null;
    return members.find((m) => m.id === deleteConfirmId);
  }, [deleteConfirmId, members]);

  // 휴직 대상 멤버 메모이제이션
  const memberToLeave = useMemo(() => {
    if (!leaveModalMemberId) return null;
    return members.find((m) => m.id === leaveModalMemberId);
  }, [leaveModalMemberId, members]);

  // 콜백 함수들 메모이제이션
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess('대원이 삭제되었습니다.');
        onRefetch?.();
        setDeleteConfirmId(null);
      } catch (error) {
        logger.error('Delete error:', error);
        showError('대원 삭제에 실패했습니다.');
      }
    },
    [deleteMutation, onRefetch]
  );

  const handleStatusChange = useCallback(
    async (memberId: string, newStatus: MemberStatus) => {
      // 휴직으로 변경할 때는 휴직 정보 입력 모달을 띄움
      if (newStatus === 'ON_LEAVE') {
        setLeaveModalMemberId(memberId);
        // 폼 초기화
        const today = new Date();
        setLeaveFormData({
          leave_reason: '',
          leave_start_date: format(today, 'yyyy-MM-dd'),
          leave_duration_months: 3,
          expected_return_date: format(addMonths(today, 3), 'yyyy-MM-dd'),
          showDetails: false, // 기본적으로 상세 정보 접음
        });
        return;
      }

      // 휴직에서 다른 상태로 변경할 때는 복직 처리 모달을 띄움
      const currentMember = members.find((m) => m.id === memberId);
      if (currentMember?.member_status === 'ON_LEAVE') {
        const { days, months, sessions } = calculateRequiredPracticeSessions(
          currentMember.leave_start_date
        );
        setReturnModalInfo({
          memberId,
          memberName: currentMember.name,
          leaveStartDate: currentMember.leave_start_date,
          leaveDurationDays: days,
          leaveDurationMonths: months,
          requiredPracticeSessions: sessions,
          targetStatus: newStatus,
        });
        return;
      }

      // 신입 → 정대원 승격은 확인을 받는다.
      //
      // 막지는 않는다. 세트를 덜 채웠어도 지휘자가 사정상 조기 승격을 결정할 수 있고,
      // 시스템이 그 재량을 대신 판단할 근거가 없다. 다만 목표 미달을 모르고 누른
      // 경우와 알고 누른 경우를 구분해야 하므로, 현재 진행도를 보여주고 한 번 묻는다.
      if (currentMember?.member_status === 'NEW' && newStatus === 'REGULAR') {
        const progress = practiceSetProgressById?.[memberId];
        setPromoteModalInfo({
          memberId,
          memberName: currentMember.name,
          // 집계가 아직 안 왔으면 진행도를 지어내지 않는다 — 모달이 "확인 중"으로 뜬다.
          completed: progress?.completed ?? null,
          required: progress?.required ?? null,
          isEligible: progress?.isEligible ?? false,
        });
        return;
      }

      // 일반 상태 변경
      setUpdatingStatusId(memberId);
      try {
        await updateMutation.mutateAsync({
          id: memberId,
          data: { member_status: newStatus },
        });
        showSuccess('상태가 변경되었습니다.');
        onRefetch?.();
      } catch (error) {
        logger.error('Status update error:', error);
        showError('상태 변경에 실패했습니다.');
      } finally {
        setUpdatingStatusId(null);
      }
    },
    [updateMutation, onRefetch, members, practiceSetProgressById]
  );

  /**
   * 승격 확정 — 모달에서 "승격" 을 누른 뒤 실제로 저장한다.
   *
   * member_status와 함께 regular_member_since를 채운다. 승격일이 없으면 나중에
   * "언제 정대원이 됐는지"를 되짚을 방법이 없고, 목록의 정대원 임명일 칸이 계속 '-'다.
   *
   * version을 함께 보내 낙관적 잠금을 건다. 기존 상태 변경 경로는 version을 안 보내
   * 마지막 저장이 이기는데, 승격은 두 사람이 동시에 판단할 수 있는 작업이라
   * 조용히 덮어쓰면 안 된다.
   */
  const handlePromoteConfirm = useCallback(async () => {
    if (!promoteModalInfo) return;

    const { memberId } = promoteModalInfo;
    const target = members.find((m) => m.id === memberId);

    setUpdatingStatusId(memberId);
    try {
      await updateMutation.mutateAsync({
        id: memberId,
        data: {
          member_status: 'REGULAR',
          regular_member_since: format(new Date(), 'yyyy-MM-dd'),
          ...(target?.version !== undefined &&
            target?.version !== null && { version: target.version }),
        },
      });
      showSuccess('정대원으로 승격되었습니다.');
      onRefetch?.();
      setPromoteModalInfo(null);
    } catch (error) {
      logger.error('Promote error:', error);
      if ((error as { code?: string }).code === 'VERSION_CONFLICT') {
        showError('다른 곳에서 이 대원 정보가 수정되었습니다. 새로고침 후 다시 시도해주세요.');
      } else {
        showError('승격에 실패했습니다.');
      }
    } finally {
      setUpdatingStatusId(null);
    }
  }, [promoteModalInfo, members, updateMutation, onRefetch]);

  // 휴직 정보 제출 핸들러
  const handleLeaveSubmit = useCallback(
    async (includeDetails: boolean = true) => {
      if (!leaveModalMemberId) return;

      setUpdatingStatusId(leaveModalMemberId);
      try {
        // 상세 정보 포함 여부에 따라 데이터 구성
        const updateData = includeDetails
          ? {
              member_status: 'ON_LEAVE' as const,
              leave_reason: leaveFormData.leave_reason || null,
              leave_start_date: leaveFormData.leave_start_date || null,
              leave_duration_months: leaveFormData.leave_duration_months,
              expected_return_date: leaveFormData.expected_return_date || null,
            }
          : {
              member_status: 'ON_LEAVE' as const,
              leave_reason: null,
              leave_start_date: null,
              leave_duration_months: null,
              expected_return_date: null,
            };

        await updateMutation.mutateAsync({
          id: leaveModalMemberId,
          data: updateData,
        });
        showSuccess('휴직 처리되었습니다.');
        onRefetch?.();
        setLeaveModalMemberId(null);
      } catch (error) {
        logger.error('Leave status update error:', error);
        showError('휴직 처리에 실패했습니다.');
      } finally {
        setUpdatingStatusId(null);
      }
    },
    [leaveModalMemberId, leaveFormData, updateMutation, onRefetch]
  );

  // 휴직 기간 변경 시 복직 예정일 자동 계산
  const handleLeaveDurationChange = useCallback(
    (months: number) => {
      const startDate = leaveFormData.leave_start_date
        ? new Date(leaveFormData.leave_start_date)
        : new Date();

      setLeaveFormData((prev) => ({
        ...prev,
        leave_duration_months: months,
        expected_return_date: format(addMonths(startDate, months), 'yyyy-MM-dd'),
      }));
    },
    [leaveFormData.leave_start_date]
  );

  // 휴직 시작일 변경 시 복직 예정일 자동 계산
  const handleLeaveStartDateChange = useCallback(
    (date: string) => {
      const startDate = new Date(date);
      const months = leaveFormData.leave_duration_months || 3;

      setLeaveFormData((prev) => ({
        ...prev,
        leave_start_date: date,
        expected_return_date: format(addMonths(startDate, months), 'yyyy-MM-dd'),
      }));
    },
    [leaveFormData.leave_duration_months]
  );

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  const handleCancelLeave = useCallback(() => {
    setLeaveModalMemberId(null);
  }, []);

  // 복직 처리 확인 핸들러
  const handleReturnFromLeaveConfirm = useCallback(async () => {
    if (!returnModalInfo) return;

    setUpdatingStatusId(returnModalInfo.memberId);
    try {
      await updateMutation.mutateAsync({
        id: returnModalInfo.memberId,
        data: {
          member_status: returnModalInfo.targetStatus,
          // 휴직 정보 초기화
          leave_reason: null,
          leave_start_date: null,
          leave_duration_months: null,
          expected_return_date: null,
        },
      });
      showSuccess('복직 처리되었습니다.');
      onRefetch?.();
      setReturnModalInfo(null);
    } catch (error) {
      logger.error('Return from leave error:', error);
      showError('복직 처리에 실패했습니다.');
    } finally {
      setUpdatingStatusId(null);
    }
  }, [returnModalInfo, updateMutation, onRefetch]);

  const handleCancelReturn = useCallback(() => {
    setReturnModalInfo(null);
  }, []);

  return (
    <>
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-neutral-700 uppercase"
              >
                대원
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-neutral-700 uppercase"
              >
                파트
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-neutral-700 uppercase"
              >
                역할
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-neutral-700 uppercase"
              >
                상태
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-neutral-700 uppercase"
              >
                임명일
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-neutral-700 uppercase"
              >
                최근 등단
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-neutral-700 uppercase"
              >
                최근 연습
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold tracking-wider text-neutral-700 uppercase"
              >
                액션
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                updatingStatusId={updatingStatusId}
                isDeleting={deleteMutation.isPending}
                practiceSetProgress={practiceSetProgressById?.[member.id]}
                onStatusChange={handleStatusChange}
                onDeleteClick={handleDeleteClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirmId && memberToDelete && (
        <div
          className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={handleCancelDelete}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-neutral-900">찬양대원 삭제</h3>
            <p className="mb-4 text-sm text-neutral-600">
              <strong>{memberToDelete.name}</strong> 찬양대원을 정말 삭제하시겠습니까?
              <br />
              관련된 모든 출석 기록과 자리배치 정보도 함께 삭제됩니다.
            </p>
            {deleteMutation.error && (
              <p className="mb-4 text-sm text-red-600">{deleteMutation.error.message}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleCancelDelete}
                className="flex-1"
                disabled={deleteMutation.isPending}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 휴직 정보 입력 모달 */}
      {leaveModalMemberId && memberToLeave && (
        <div
          className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={handleCancelLeave}
        >
          <div
            className="mx-4 w-full max-w-md rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">휴직 처리</h3>
              <button
                onClick={handleCancelLeave}
                className="p-1 text-neutral-400 transition-colors hover:text-neutral-600"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 대원 정보 */}
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--color-warning-200)] bg-[var(--color-warning-50)] p-3">
              <MemberAvatar name={memberToLeave.name} part={memberToLeave.part} />
              <div>
                <div className="text-sm font-medium text-neutral-900">{memberToLeave.name}</div>
                <div className="text-xs text-[var(--color-warning-600)]">
                  휴직대원으로 변경됩니다
                </div>
              </div>
            </div>

            {/* 상세 정보 토글 */}
            <button
              type="button"
              onClick={() =>
                setLeaveFormData((prev) => ({ ...prev, showDetails: !prev.showDetails }))
              }
              className="mb-4 flex w-full items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              <span>휴직 상세 정보 입력 (선택)</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${leaveFormData.showDetails ? 'rotate-180' : ''}`}
              />
            </button>

            {/* 휴직 정보 폼 - 토글로 표시 */}
            {leaveFormData.showDetails && (
              <div className="mb-4 space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                {/* 휴직 사유 */}
                <div className="space-y-1.5">
                  <Label htmlFor="leave_reason" className="text-sm font-medium">
                    휴직 사유
                    <span className="ml-1 text-xs text-neutral-400">(선택)</span>
                  </Label>
                  <Input
                    type="text"
                    id="leave_reason"
                    placeholder="예: 해외 출장, 건강 문제, 개인 사정 등"
                    value={leaveFormData.leave_reason}
                    onChange={(e) =>
                      setLeaveFormData((prev) => ({
                        ...prev,
                        leave_reason: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* 휴직 시작일 & 기간 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="leave_start_date" className="text-sm font-medium">
                      휴직 시작일
                      <span className="ml-1 text-xs text-neutral-400">(선택)</span>
                    </Label>
                    <Input
                      type="date"
                      id="leave_start_date"
                      value={leaveFormData.leave_start_date}
                      onChange={(e) => handleLeaveStartDateChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="leave_duration_months" className="text-sm font-medium">
                      휴직 기간
                      <span className="ml-1 text-xs text-neutral-400">(선택)</span>
                    </Label>
                    <Input
                      type="number"
                      id="leave_duration_months"
                      min={1}
                      max={24}
                      placeholder="개월"
                      value={leaveFormData.leave_duration_months || ''}
                      onChange={(e) => handleLeaveDurationChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                {/* 복직 예정일 */}
                <div className="space-y-1.5">
                  <Label htmlFor="expected_return_date" className="text-sm font-medium">
                    복직 예정일
                    <span className="ml-1 text-xs text-neutral-400">(선택)</span>
                  </Label>
                  <Input
                    type="date"
                    id="expected_return_date"
                    value={leaveFormData.expected_return_date}
                    onChange={(e) =>
                      setLeaveFormData((prev) => ({
                        ...prev,
                        expected_return_date: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-neutral-500">
                    휴직 기간에 따라 자동 계산됩니다. 직접 수정도 가능합니다.
                  </p>
                </div>
              </div>
            )}

            {/* 에러 메시지 */}
            {updateMutation.error && (
              <p className="mb-4 text-sm text-red-600">{updateMutation.error.message}</p>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleCancelLeave}
                className="flex-1"
                disabled={updatingStatusId === leaveModalMemberId}
              >
                취소
              </Button>
              <Button
                variant="warning"
                onClick={() => handleLeaveSubmit(leaveFormData.showDetails)}
                className="flex-1"
                disabled={updatingStatusId === leaveModalMemberId}
              >
                {updatingStatusId === leaveModalMemberId ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    처리 중...
                  </span>
                ) : (
                  '휴직 처리'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 복직 처리 확인 모달 */}
      {returnModalInfo && (
        <div
          className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={handleCancelReturn}
        >
          <div
            className="mx-4 w-full max-w-md rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">복직 처리</h3>
              <button
                onClick={handleCancelReturn}
                className="p-1 text-neutral-400 transition-colors hover:text-neutral-600"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 대원 정보 */}
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--color-success-200)] bg-[var(--color-success-50)] p-3">
              <CheckCircle2 className="h-8 w-8 text-[var(--color-success-600)]" />
              <div>
                <div className="text-sm font-medium text-neutral-900">
                  {returnModalInfo.memberName}
                </div>
                <div className="text-xs text-[var(--color-success-600)]">
                  {STATUS_LABELS[returnModalInfo.targetStatus]}(으)로 변경됩니다
                </div>
              </div>
            </div>

            {/* 휴직 기간 정보 */}
            <div className="mb-4 rounded-lg bg-neutral-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-700">휴직 기간</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-neutral-500">휴직 시작일</span>
                  <p className="font-medium text-neutral-900">
                    {returnModalInfo.leaveStartDate
                      ? format(new Date(returnModalInfo.leaveStartDate), 'yyyy.MM.dd')
                      : '기록 없음'}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">휴직 기간</span>
                  <p className="font-medium text-neutral-900">
                    {returnModalInfo.leaveDurationMonths >= 1
                      ? `약 ${returnModalInfo.leaveDurationMonths}개월 (${returnModalInfo.leaveDurationDays}일)`
                      : `${returnModalInfo.leaveDurationDays}일`}
                  </p>
                </div>
              </div>
            </div>

            {/* 재등단 조건 안내 */}
            <div className="mb-4 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-4">
              <h4 className="mb-2 text-sm font-semibold text-[var(--color-primary-700)]">
                📋 재등단 조건
              </h4>
              <div className="space-y-2">
                <p className="text-sm text-[var(--color-primary-900)]">
                  {returnModalInfo.leaveDurationMonths < 1 ? (
                    <>
                      휴직 기간이 <strong>1개월 미만</strong>이므로,
                      <br />
                      <strong className="text-[var(--color-primary-700)]">연습 2회 참여</strong> 후
                      재등단 가능합니다.
                    </>
                  ) : (
                    <>
                      휴직 기간이 <strong>1개월 이상</strong>이므로,
                      <br />
                      <strong className="text-[var(--color-primary-700)]">연습 4회 참여</strong> 후
                      재등단 가능합니다.
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2 border-t border-[var(--color-primary-200)] pt-2">
                  <div className="flex-1 rounded-md bg-white py-2 text-center">
                    <div className="text-2xl font-bold text-[var(--color-primary-600)]">
                      {returnModalInfo.requiredPracticeSessions}회
                    </div>
                    <div className="text-xs text-neutral-500">필요 연습 참여</div>
                  </div>
                </div>
              </div>
            </div>

            <p className="mb-4 text-xs text-neutral-500">
              ※ 복직 처리 후 위 조건을 충족해야 예배 등단이 가능합니다. 파트장에게 연습 참여 확인을
              받으세요.
            </p>

            {/* 에러 메시지 */}
            {updateMutation.error && (
              <p className="mb-4 text-sm text-red-600">{updateMutation.error.message}</p>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleCancelReturn}
                className="flex-1"
                disabled={updatingStatusId === returnModalInfo.memberId}
              >
                취소
              </Button>
              <Button
                variant="success"
                onClick={handleReturnFromLeaveConfirm}
                className="flex-1"
                disabled={updatingStatusId === returnModalInfo.memberId}
              >
                {updatingStatusId === returnModalInfo.memberId ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    처리 중...
                  </span>
                ) : (
                  '복직 처리'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 정대원 승격 확인 모달 */}
      {promoteModalInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPromoteModalInfo(null)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">정대원 승격</h3>
              <button
                onClick={() => setPromoteModalInfo(null)}
                className="p-1 text-neutral-400 transition-colors hover:text-neutral-600"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 대원 정보 — 목표 달성 여부에 따라 색이 갈린다 */}
            <div
              className={`mb-4 flex items-center gap-3 rounded-lg border p-3 ${
                promoteModalInfo.isEligible
                  ? 'border-[var(--color-success-200)] bg-[var(--color-success-50)]'
                  : 'border-[var(--color-warning-200)] bg-[var(--color-warning-50)]'
              }`}
            >
              {promoteModalInfo.isEligible ? (
                <CheckCircle2 className="h-8 w-8 flex-shrink-0 text-[var(--color-success-600)]" />
              ) : (
                <AlertTriangle className="h-8 w-8 flex-shrink-0 text-[var(--color-warning-600)]" />
              )}
              <div>
                <div className="text-sm font-medium text-neutral-900">
                  {promoteModalInfo.memberName}
                </div>
                <div
                  className={`text-xs ${
                    promoteModalInfo.isEligible
                      ? 'text-[var(--color-success-600)]'
                      : 'text-[var(--color-warning-700)]'
                  }`}
                >
                  {promoteModalInfo.completed === null
                    ? '연습 세트 현황을 확인하는 중입니다'
                    : promoteModalInfo.isEligible
                      ? '필요한 연습 세트를 모두 채웠습니다'
                      : '아직 필요한 연습 세트를 채우지 못했습니다'}
                </div>
              </div>
            </div>

            {/* 세트 진행도 */}
            <div className="mb-4 rounded-lg bg-neutral-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">연습 세트</span>
                <span className="text-sm font-semibold text-neutral-900">
                  {promoteModalInfo.completed === null || promoteModalInfo.required === null
                    ? '확인 중'
                    : `${promoteModalInfo.completed} / ${promoteModalInfo.required} 세트`}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                예배 전 연습과 예배 후 연습에 모두 참석해야 1세트로 인정됩니다.
              </p>
            </div>

            {/* 미달 상태에서만 경고를 띄운다. 채운 경우엔 굳이 겁줄 이유가 없다. */}
            {promoteModalInfo.completed !== null && !promoteModalInfo.isEligible && (
              <p className="mb-4 text-xs text-[var(--color-warning-700)]">
                ※ 목표 세트를 채우지 않았습니다. 그래도 승격하려면 아래 버튼을 눌러주세요.
              </p>
            )}

            <p className="mb-4 text-xs text-neutral-500">
              ※ 승격하면 오늘 날짜가 정대원 임명일로 기록되고, 예배 등단 대상에 포함됩니다.
            </p>

            {updateMutation.error && (
              <p className="mb-4 text-sm text-red-600">{updateMutation.error.message}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setPromoteModalInfo(null)}
                className="flex-1"
                disabled={updatingStatusId === promoteModalInfo.memberId}
              >
                취소
              </Button>
              <Button
                variant={promoteModalInfo.isEligible ? 'success' : 'warning'}
                onClick={handlePromoteConfirm}
                className="flex-1"
                disabled={updatingStatusId === promoteModalInfo.memberId}
              >
                {updatingStatusId === promoteModalInfo.memberId ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    처리 중...
                  </span>
                ) : (
                  '정대원으로 승격'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
