'use client';

import { addMonths } from 'date-fns/addMonths';
import { differenceInDays } from 'date-fns/differenceInDays';
import { differenceInMonths } from 'date-fns/differenceInMonths';
import { format } from 'date-fns/format';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Eye,
  Loader2,
  MoreVertical,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';

import { memo, useCallback, useState } from 'react';

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

import { useDeleteMember, useUpdateMember } from '@/hooks/useMembers';

import { createLogger } from '@/lib/logger';
import { showError, showSuccess } from '@/lib/toast';

import type { Database } from '@/types/database.types';

import MemberAvatar from './MemberAvatar';

const logger = createLogger({ prefix: 'MemberListItem' });

type Member = Database['public']['Tables']['members']['Row'];
type Part = Database['public']['Enums']['part'];
type MemberStatus = Database['public']['Enums']['member_status'];

interface MemberListItemProps {
  member: Member;
  onDelete?: () => void;
}

// 파트별 색상 (악보 스티커 색상 기준 - 자리배치와 통일)
const PART_COLORS: Partial<Record<Part, string>> = {
  SOPRANO:
    'text-[var(--color-part-soprano-600)] bg-[var(--color-part-soprano-50)] border-[var(--color-part-soprano-200)]',
  ALTO: 'text-[var(--color-part-alto-600)] bg-[var(--color-part-alto-50)] border-[var(--color-part-alto-200)]',
  TENOR:
    'text-[var(--color-part-tenor-600)] bg-[var(--color-part-tenor-50)] border-[var(--color-part-tenor-200)]',
  BASS: 'text-[var(--color-part-bass-600)] bg-[var(--color-part-bass-50)] border-[var(--color-part-bass-200)]',
  SPECIAL:
    'text-[var(--color-part-special-600)] bg-[var(--color-part-special-50)] border-[var(--color-part-special-200)]',
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

// 상태별 색상
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

// 상태 옵션
const STATUS_OPTIONS: MemberStatus[] = ['REGULAR', 'NEW', 'ON_LEAVE', 'RESIGNED', 'GUEST'];

// 휴직 정보 폼 데이터
interface LeaveInfoFormData {
  leave_reason: string;
  leave_start_date: string;
  leave_duration_months: number | null;
  expected_return_date: string;
}

// 복직 처리 정보
interface ReturnFromLeaveInfo {
  leaveDurationDays: number;
  leaveDurationMonths: number;
  requiredPracticeSessions: number;
  targetStatus: MemberStatus;
}

/**
 * 휴직 기간에 따른 재등단 조건 계산
 */
const calculateRequiredPracticeSessions = (
  leaveStartDate: string | null
): { days: number; months: number; sessions: number } => {
  if (!leaveStartDate) {
    return { days: 30, months: 1, sessions: 4 };
  }
  const startDate = new Date(leaveStartDate);
  const today = new Date();
  const days = differenceInDays(today, startDate);
  const months = differenceInMonths(today, startDate);
  const sessions = months < 1 ? 2 : 4;
  return { days, months, sessions };
};

function MemberListItem({ member, onDelete }: MemberListItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // 휴직 모달 상태
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState<LeaveInfoFormData>({
    leave_reason: '',
    leave_start_date: format(new Date(), 'yyyy-MM-dd'),
    leave_duration_months: 3,
    expected_return_date: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
  });

  // 복직 모달 상태
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnInfo, setReturnInfo] = useState<ReturnFromLeaveInfo | null>(null);

  const deleteMutation = useDeleteMember();
  const updateMutation = useUpdateMember();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(member.id);
      showSuccess('대원이 삭제되었습니다.');
      onDelete?.();
      setShowDeleteConfirm(false);
    } catch (error) {
      logger.error('Delete error:', error);
      showError('삭제에 실패했습니다.');
    }
  };

  // 상태 변경 핸들러
  const handleStatusChange = useCallback(
    async (newStatus: MemberStatus) => {
      // 휴직으로 변경할 때
      if (newStatus === 'ON_LEAVE') {
        const today = new Date();
        setLeaveFormData({
          leave_reason: '',
          leave_start_date: format(today, 'yyyy-MM-dd'),
          leave_duration_months: 3,
          expected_return_date: format(addMonths(today, 3), 'yyyy-MM-dd'),
        });
        setShowLeaveModal(true);
        return;
      }

      // 휴직에서 다른 상태로 변경할 때
      if (member.member_status === 'ON_LEAVE') {
        const { days, months, sessions } = calculateRequiredPracticeSessions(
          member.leave_start_date
        );
        setReturnInfo({
          leaveDurationDays: days,
          leaveDurationMonths: months,
          requiredPracticeSessions: sessions,
          targetStatus: newStatus,
        });
        setShowReturnModal(true);
        return;
      }

      // 일반 상태 변경
      setIsUpdatingStatus(true);
      try {
        await updateMutation.mutateAsync({
          id: member.id,
          data: { member_status: newStatus },
        });
        showSuccess('상태가 변경되었습니다.');
        onDelete?.(); // refetch
      } catch (error) {
        logger.error('Status update error:', error);
        showError('상태 변경에 실패했습니다.');
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [member, updateMutation, onDelete]
  );

  // 휴직 처리 제출
  const handleLeaveSubmit = useCallback(async () => {
    setIsUpdatingStatus(true);
    try {
      await updateMutation.mutateAsync({
        id: member.id,
        data: {
          member_status: 'ON_LEAVE',
          leave_reason: leaveFormData.leave_reason || null,
          leave_start_date: leaveFormData.leave_start_date || null,
          leave_duration_months: leaveFormData.leave_duration_months,
          expected_return_date: leaveFormData.expected_return_date || null,
        },
      });
      showSuccess('휴직 처리되었습니다.');
      onDelete?.(); // refetch
      setShowLeaveModal(false);
    } catch (error) {
      logger.error('Leave status update error:', error);
      showError('휴직 처리에 실패했습니다.');
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [member.id, leaveFormData, updateMutation, onDelete]);

  // 복직 처리 확인
  const handleReturnConfirm = useCallback(async () => {
    if (!returnInfo) return;
    setIsUpdatingStatus(true);
    try {
      await updateMutation.mutateAsync({
        id: member.id,
        data: {
          member_status: returnInfo.targetStatus,
          leave_reason: null,
          leave_start_date: null,
          leave_duration_months: null,
          expected_return_date: null,
        },
      });
      showSuccess('복직 처리되었습니다.');
      onDelete?.(); // refetch
      setShowReturnModal(false);
    } catch (error) {
      logger.error('Return from leave error:', error);
      showError('복직 처리에 실패했습니다.');
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [member.id, returnInfo, updateMutation, onDelete]);

  // 휴직 기간 변경 핸들러
  const handleLeaveDurationChange = (months: number) => {
    const startDate = leaveFormData.leave_start_date
      ? new Date(leaveFormData.leave_start_date)
      : new Date();
    setLeaveFormData((prev) => ({
      ...prev,
      leave_duration_months: months,
      expected_return_date: format(addMonths(startDate, months), 'yyyy-MM-dd'),
    }));
  };

  // 휴직 시작일 변경 핸들러
  const handleLeaveStartDateChange = (date: string) => {
    const startDate = new Date(date);
    const months = leaveFormData.leave_duration_months || 3;
    setLeaveFormData((prev) => ({
      ...prev,
      leave_start_date: date,
      expected_return_date: format(addMonths(startDate, months), 'yyyy-MM-dd'),
    }));
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-3 transition-colors hover:bg-[var(--color-background-secondary)]">
        <Link
          href={`/management/members/${member.id}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <MemberAvatar name={member.name} part={member.part} size="sm" />

          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-[var(--color-text-primary)]">
                {member.name}
              </span>
              {member.is_leader && (
                <span className="rounded bg-[var(--color-primary-100)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary-700)]">
                  리더
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
              <span className={`rounded border px-1.5 py-0.5 ${PART_COLORS[member.part]}`}>
                {PART_LABELS[member.part]}
              </span>
            </div>
          </div>
        </Link>

        {/* 상태 드롭다운 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`mr-2 inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-opacity hover:opacity-80 ${STATUS_COLORS[member.member_status]} `}
              disabled={isUpdatingStatus}
              onClick={(e) => e.preventDefault()}
            >
              {isUpdatingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {STATUS_LABELS[member.member_status]}
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {/* 휴직대원일 때 복직 옵션 */}
            {member.member_status === 'ON_LEAVE' && (
              <>
                <DropdownMenuItem
                  onClick={() => handleStatusChange('REGULAR')}
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
                    handleStatusChange(status);
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

        {/* 액션 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">메뉴 열기</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link
                href={`/management/members/${member.id}`}
                className="flex cursor-pointer items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                <span>상세보기</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`/management/members/${member.id}/edit`}
                className="flex cursor-pointer items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                <span>수정</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowDeleteConfirm(true)}
              className="flex cursor-pointer items-center gap-2 text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              <span>삭제</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
          <div className="w-full max-w-sm rounded-lg bg-[var(--color-background-primary)] p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
              찬양대원 삭제
            </h3>
            <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
              <strong>{member.name}</strong> 님을 삭제하시겠습니까?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 휴직 정보 입력 모달 */}
      {showLeaveModal && (
        <div
          className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
          onClick={() => setShowLeaveModal(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">휴직 처리</h3>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--color-warning-200)] bg-[var(--color-warning-50)] p-3">
              <MemberAvatar name={member.name} part={member.part} size="sm" />
              <div>
                <div className="text-sm font-medium">{member.name}</div>
                <div className="text-xs text-[var(--color-warning-600)]">
                  휴직대원으로 변경됩니다
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mobile_leave_reason" className="text-sm font-medium">
                  휴직 사유
                </Label>
                <Input
                  id="mobile_leave_reason"
                  placeholder="예: 해외 출장, 건강 문제"
                  value={leaveFormData.leave_reason}
                  onChange={(e) =>
                    setLeaveFormData((prev) => ({ ...prev, leave_reason: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mobile_leave_start" className="text-sm font-medium">
                    휴직 시작일
                  </Label>
                  <Input
                    type="date"
                    id="mobile_leave_start"
                    value={leaveFormData.leave_start_date}
                    onChange={(e) => handleLeaveStartDateChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mobile_leave_duration" className="text-sm font-medium">
                    기간 (개월)
                  </Label>
                  <Input
                    type="number"
                    id="mobile_leave_duration"
                    min={1}
                    max={24}
                    value={leaveFormData.leave_duration_months || ''}
                    onChange={(e) => handleLeaveDurationChange(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobile_return_date" className="text-sm font-medium">
                  복직 예정일
                </Label>
                <Input
                  type="date"
                  id="mobile_return_date"
                  value={leaveFormData.expected_return_date}
                  onChange={(e) =>
                    setLeaveFormData((prev) => ({ ...prev, expected_return_date: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLeaveModal(false)}
                disabled={isUpdatingStatus}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-[var(--color-warning-600)] hover:bg-[var(--color-warning-700)]"
                onClick={handleLeaveSubmit}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                휴직 처리
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 복직 처리 모달 */}
      {showReturnModal && returnInfo && (
        <div
          className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
          onClick={() => setShowReturnModal(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">복직 처리</h3>
              <button
                onClick={() => setShowReturnModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--color-success-200)] bg-[var(--color-success-50)] p-3">
              <CheckCircle2 className="h-8 w-8 text-[var(--color-success-600)]" />
              <div>
                <div className="text-sm font-medium">{member.name}</div>
                <div className="text-xs text-[var(--color-success-600)]">
                  {STATUS_LABELS[returnInfo.targetStatus]}(으)로 변경됩니다
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-neutral-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-700">휴직 기간</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-neutral-500">휴직 시작일</span>
                  <p className="font-medium">
                    {member.leave_start_date
                      ? format(new Date(member.leave_start_date), 'yyyy.MM.dd')
                      : '기록 없음'}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">휴직 기간</span>
                  <p className="font-medium">
                    {returnInfo.leaveDurationMonths >= 1
                      ? `약 ${returnInfo.leaveDurationMonths}개월`
                      : `${returnInfo.leaveDurationDays}일`}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-4">
              <h4 className="mb-2 text-sm font-semibold text-[var(--color-primary-700)]">
                📋 재등단 조건
              </h4>
              <p className="mb-3 text-sm text-[var(--color-primary-900)]">
                {returnInfo.leaveDurationMonths < 1 ? (
                  <>
                    휴직 기간 <strong>1개월 미만</strong>:{' '}
                    <strong className="text-[var(--color-primary-700)]">연습 2회</strong> 참여 필요
                  </>
                ) : (
                  <>
                    휴직 기간 <strong>1개월 이상</strong>:{' '}
                    <strong className="text-[var(--color-primary-700)]">연습 4회</strong> 참여 필요
                  </>
                )}
              </p>
              <div className="rounded-md bg-white py-2 text-center">
                <div className="text-2xl font-bold text-[var(--color-primary-600)]">
                  {returnInfo.requiredPracticeSessions}회
                </div>
                <div className="text-xs text-neutral-500">필요 연습 참여</div>
              </div>
            </div>

            <p className="mb-4 text-xs text-neutral-500">
              ※ 복직 후 위 조건 충족 시 예배 등단 가능합니다.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowReturnModal(false)}
                disabled={isUpdatingStatus}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-[var(--color-success-600)] hover:bg-[var(--color-success-700)]"
                onClick={handleReturnConfirm}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                복직 처리
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(MemberListItem);
