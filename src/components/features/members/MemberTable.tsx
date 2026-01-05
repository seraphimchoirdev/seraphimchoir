'use client';
'use memo';

import { useState, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns/format';
import { addMonths } from 'date-fns/addMonths';
import { Eye, Edit2, Trash2, ChevronDown, Loader2, X } from 'lucide-react';
import MemberAvatar from './MemberAvatar';
import { useDeleteMember, useUpdateMember } from '@/hooks/useMembers';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Database } from '@/types/database.types';

type Member = Database['public']['Tables']['members']['Row'];
type Part = Database['public']['Enums']['part'];
type MemberStatus = Database['public']['Enums']['member_status'];

// 휴직 정보 폼 데이터
interface LeaveInfoFormData {
  leave_reason: string;
  leave_start_date: string;
  leave_duration_months: number | null;
  expected_return_date: string;
}

interface MemberTableProps {
  members: Member[];
  onRefetch?: () => void;
}

// 파트별 색상 (악보 스티커 색상 기준 - 자리배치와 통일)
const PART_COLORS: Partial<Record<Part, { bg: string; text: string; border: string }>> = {
  SOPRANO: { bg: 'bg-[var(--color-part-soprano-50)]', text: 'text-[var(--color-part-soprano-600)]', border: 'border-[var(--color-part-soprano-500)]' },
  ALTO: { bg: 'bg-[var(--color-part-alto-50)]', text: 'text-[var(--color-part-alto-600)]', border: 'border-[var(--color-part-alto-500)]' },
  TENOR: { bg: 'bg-[var(--color-part-tenor-50)]', text: 'text-[var(--color-part-tenor-600)]', border: 'border-[var(--color-part-tenor-500)]' },
  BASS: { bg: 'bg-[var(--color-part-bass-50)]', text: 'text-[var(--color-part-bass-600)]', border: 'border-[var(--color-part-bass-500)]' },
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
};

// 상태별 색상 (시맨틱 컬러 - 디자인 시스템 변수 사용)
const STATUS_COLORS: Record<MemberStatus, string> = {
  REGULAR: 'bg-[var(--color-success-100)] text-[var(--color-success-700)] border-[var(--color-success-200)]',
  NEW: 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border-[var(--color-primary-200)]',
  ON_LEAVE: 'bg-[var(--color-part-special-100)] text-[var(--color-part-special-700)] border-[var(--color-part-special-200)]',
  RESIGNED: 'bg-[var(--color-error-100)] text-[var(--color-error-700)] border-[var(--color-error-200)]',
};

/**
 * MemberTable 컴포넌트
 * 데스크톱에서 사용하는 테이블 형태의 찬양대원 목록
 */
// 상태 변경 순서 정의 (드롭다운 메뉴 순서)
const STATUS_OPTIONS: MemberStatus[] = ['REGULAR', 'NEW', 'ON_LEAVE', 'RESIGNED'];

// 개별 테이블 행 컴포넌트 (메모이제이션)
interface MemberRowProps {
  member: Member;
  updatingStatusId: string | null;
  isDeleting: boolean;
  onStatusChange: (memberId: string, newStatus: MemberStatus) => void;
  onDeleteClick: (id: string) => void;
}

const MemberRow = memo(function MemberRow({
  member,
  updatingStatusId,
  isDeleting,
  onStatusChange,
  onDeleteClick,
}: MemberRowProps) {
  return (
    <tr className="group hover:bg-neutral-50 transition-colors">
      {/* 대원 (아바타 + 이름) */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <MemberAvatar name={member.name} part={member.part} />
          <div>
            <div className="text-sm font-medium text-neutral-900">
              {member.name}
            </div>
            {member.phone_number && (
              <div className="text-xs text-neutral-500">
                {member.phone_number}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* 파트 */}
      <td className="px-4 py-4 whitespace-nowrap">
        <span
          className={`
            inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border
            ${PART_COLORS[member.part]?.bg || 'bg-[var(--color-part-special-50)]'}
            ${PART_COLORS[member.part]?.text || 'text-[var(--color-part-special-600)]'}
            ${PART_COLORS[member.part]?.border || 'border-[var(--color-part-special-500)]'}
          `}
        >
          {PART_LABELS[member.part] || member.part}
        </span>
      </td>

      {/* 역할 */}
      <td className="px-4 py-4 whitespace-nowrap">
        {member.is_leader ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border border-[var(--color-primary-200)]">
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
                className={`
                  inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border
                  cursor-pointer hover:opacity-80 transition-opacity
                  ${STATUS_COLORS[member.member_status]}
                `}
                disabled={updatingStatusId === member.id}
              >
                {updatingStatusId === member.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : null}
                {STATUS_LABELS[member.member_status]}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32">
              {STATUS_OPTIONS.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => {
                    if (status !== member.member_status) {
                      onStatusChange(member.id, status);
                    }
                  }}
                  className={`
                    cursor-pointer text-xs
                    ${status === member.member_status ? 'bg-[var(--color-background-tertiary)] font-semibold' : ''}
                  `}
                >
                  <span
                    className={`
                      inline-block w-2 h-2 rounded-full mr-2
                      ${status === 'REGULAR' ? 'bg-[var(--color-success-500)]' : ''}
                      ${status === 'NEW' ? 'bg-[var(--color-primary-500)]' : ''}
                      ${status === 'ON_LEAVE' ? 'bg-[var(--color-part-special-500)]' : ''}
                      ${status === 'RESIGNED' ? 'bg-[var(--color-error-500)]' : ''}
                    `}
                  />
                  {STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* 휴직대원일 때 복직 예정일 표시 */}
          {member.member_status === 'ON_LEAVE' && member.expected_return_date && (
            <span className="text-[10px] text-[var(--color-warning-600)]" title={member.leave_reason || '휴직 중'}>
              복직: {format(new Date(member.expected_return_date), 'yy.MM.dd')}
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

      {/* 액션 버튼 */}
      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/members/${member.id}`}
            className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            aria-label="상세보기"
            title="상세보기"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            href={`/members/${member.id}/edit`}
            className="inline-flex items-center justify-center p-2 text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
            aria-label="수정"
            title="수정"
          >
            <Edit2 className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onDeleteClick(member.id)}
            className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            aria-label="삭제"
            title="삭제"
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
  });

  const deleteMutation = useDeleteMember();
  const updateMutation = useUpdateMember();

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
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      onRefetch?.();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  }, [deleteMutation, onRefetch]);

  const handleStatusChange = useCallback(async (memberId: string, newStatus: MemberStatus) => {
    // 휴직으로 변경할 때는 모달을 띄움
    if (newStatus === 'ON_LEAVE') {
      setLeaveModalMemberId(memberId);
      // 폼 초기화
      const today = new Date();
      setLeaveFormData({
        leave_reason: '',
        leave_start_date: format(today, 'yyyy-MM-dd'),
        leave_duration_months: 3,
        expected_return_date: format(addMonths(today, 3), 'yyyy-MM-dd'),
      });
      return;
    }

    // 휴직에서 다른 상태로 변경할 때는 휴직 정보 초기화
    setUpdatingStatusId(memberId);
    try {
      const updateData: Partial<Member> = { member_status: newStatus };

      // 휴직 상태에서 벗어날 때 휴직 정보 초기화
      const currentMember = members.find((m) => m.id === memberId);
      if (currentMember?.member_status === 'ON_LEAVE') {
        updateData.leave_reason = null;
        updateData.leave_start_date = null;
        updateData.leave_duration_months = null;
        updateData.expected_return_date = null;
      }

      await updateMutation.mutateAsync({
        id: memberId,
        data: updateData,
      });
      onRefetch?.();
    } catch (error) {
      console.error('Status update error:', error);
    } finally {
      setUpdatingStatusId(null);
    }
  }, [updateMutation, onRefetch, members]);

  // 휴직 정보 제출 핸들러
  const handleLeaveSubmit = useCallback(async () => {
    if (!leaveModalMemberId) return;

    setUpdatingStatusId(leaveModalMemberId);
    try {
      await updateMutation.mutateAsync({
        id: leaveModalMemberId,
        data: {
          member_status: 'ON_LEAVE',
          leave_reason: leaveFormData.leave_reason || null,
          leave_start_date: leaveFormData.leave_start_date || null,
          leave_duration_months: leaveFormData.leave_duration_months,
          expected_return_date: leaveFormData.expected_return_date || null,
        },
      });
      onRefetch?.();
      setLeaveModalMemberId(null);
    } catch (error) {
      console.error('Leave status update error:', error);
    } finally {
      setUpdatingStatusId(null);
    }
  }, [leaveModalMemberId, leaveFormData, updateMutation, onRefetch]);

  // 휴직 기간 변경 시 복직 예정일 자동 계산
  const handleLeaveDurationChange = useCallback((months: number) => {
    const startDate = leaveFormData.leave_start_date
      ? new Date(leaveFormData.leave_start_date)
      : new Date();

    setLeaveFormData((prev) => ({
      ...prev,
      leave_duration_months: months,
      expected_return_date: format(addMonths(startDate, months), 'yyyy-MM-dd'),
    }));
  }, [leaveFormData.leave_start_date]);

  // 휴직 시작일 변경 시 복직 예정일 자동 계산
  const handleLeaveStartDateChange = useCallback((date: string) => {
    const startDate = new Date(date);
    const months = leaveFormData.leave_duration_months || 3;

    setLeaveFormData((prev) => ({
      ...prev,
      leave_start_date: date,
      expected_return_date: format(addMonths(startDate, months), 'yyyy-MM-dd'),
    }));
  }, [leaveFormData.leave_duration_months]);

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  const handleCancelLeave = useCallback(() => {
    setLeaveModalMemberId(null);
  }, []);

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider"
              >
                대원
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider"
              >
                파트
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider"
              >
                역할
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider"
              >
                상태
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider"
              >
                임명일
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wider"
              >
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                updatingStatusId={updatingStatusId}
                isDeleting={deleteMutation.isPending}
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCancelDelete}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              찬양대원 삭제
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              <strong>{memberToDelete.name}</strong>{' '}
              찬양대원을 정말 삭제하시겠습니까?
              <br />
              관련된 모든 출석 기록과 자리배치 정보도 함께 삭제됩니다.
            </p>
            {deleteMutation.error && (
              <p className="text-sm text-red-600 mb-4">
                {deleteMutation.error.message}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors"
                disabled={deleteMutation.isPending}
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 휴직 정보 입력 모달 */}
      {leaveModalMemberId && memberToLeave && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCancelLeave}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">
                휴직 처리
              </h3>
              <button
                onClick={handleCancelLeave}
                className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 대원 정보 */}
            <div className="flex items-center gap-3 p-3 bg-[var(--color-warning-50)] border border-[var(--color-warning-200)] rounded-lg mb-4">
              <MemberAvatar name={memberToLeave.name} part={memberToLeave.part} />
              <div>
                <div className="text-sm font-medium text-neutral-900">
                  {memberToLeave.name}
                </div>
                <div className="text-xs text-[var(--color-warning-600)]">
                  휴직대원으로 변경됩니다
                </div>
              </div>
            </div>

            {/* 휴직 정보 폼 */}
            <div className="space-y-4">
              {/* 휴직 사유 */}
              <div className="space-y-1.5">
                <Label htmlFor="leave_reason" className="text-sm font-medium">
                  휴직 사유
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
                    휴직 기간 (개월)
                  </Label>
                  <Input
                    type="number"
                    id="leave_duration_months"
                    min={1}
                    max={24}
                    value={leaveFormData.leave_duration_months || ''}
                    onChange={(e) =>
                      handleLeaveDurationChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
              </div>

              {/* 복직 예정일 */}
              <div className="space-y-1.5">
                <Label htmlFor="expected_return_date" className="text-sm font-medium">
                  복직 예정일
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

            {/* 에러 메시지 */}
            {updateMutation.error && (
              <p className="text-sm text-red-600 mt-4">
                {updateMutation.error.message}
              </p>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCancelLeave}
                className="flex-1 px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors"
                disabled={updatingStatusId === leaveModalMemberId}
              >
                취소
              </button>
              <button
                onClick={handleLeaveSubmit}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[var(--color-warning-600)] rounded-md hover:bg-[var(--color-warning-700)] disabled:opacity-50 transition-colors"
                disabled={updatingStatusId === leaveModalMemberId}
              >
                {updatingStatusId === leaveModalMemberId ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    처리 중...
                  </span>
                ) : (
                  '휴직 처리'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
