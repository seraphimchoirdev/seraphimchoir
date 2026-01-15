'use client';

import Link from 'next/link';
import { format } from 'date-fns/format';
import { differenceInDays } from 'date-fns/differenceInDays';
import { AlertTriangle } from 'lucide-react';
import { useDeleteMember } from '@/hooks/useMembers';
import type { Database } from '@/types/database.types';
import { useState, memo } from 'react';

type Member = Database['public']['Tables']['members']['Row'] & {
  last_service_date?: string | null;
  last_practice_date?: string | null;
};
type Part = Database['public']['Enums']['part'];
type MemberStatus = Database['public']['Enums']['member_status'];

/**
 * 출석일 기준 색상 스타일 반환
 */
const getAttendanceDateStyle = (dateStr: string | null | undefined): { textClass: string; showWarning: boolean } => {
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

interface MemberCardProps {
  member: Member;
  onDelete?: () => void;
}

// 파트별 색상 (악보 스티커 색상 기준 - 자리배치와 통일)
const PART_COLORS: Partial<Record<Part, string>> = {
  SOPRANO: 'bg-[var(--color-part-soprano-50)] text-[var(--color-part-soprano-600)] border-[var(--color-part-soprano-500)]',
  ALTO: 'bg-[var(--color-part-alto-50)] text-[var(--color-part-alto-600)] border-[var(--color-part-alto-500)]',
  TENOR: 'bg-[var(--color-part-tenor-50)] text-[var(--color-part-tenor-600)] border-[var(--color-part-tenor-500)]',
  BASS: 'bg-[var(--color-part-bass-50)] text-[var(--color-part-bass-600)] border-[var(--color-part-bass-500)]',
  SPECIAL: 'bg-[var(--color-part-special-50)] text-[var(--color-part-special-600)] border-[var(--color-part-special-500)]',
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

// 상태별 색상 (시맨틱 컬러)
const STATUS_COLORS: Record<MemberStatus, string> = {
  REGULAR: 'bg-[var(--color-success-100)] text-[var(--color-success-700)] border-[var(--color-success-200)]',
  NEW: 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border-[var(--color-primary-200)]',
  ON_LEAVE: 'bg-[var(--color-part-special-100)] text-[var(--color-part-special-700)] border-[var(--color-part-special-200)]',
  RESIGNED: 'bg-[var(--color-error-100)] text-[var(--color-error-700)] border-[var(--color-error-200)]',
};

function MemberCard({ member, onDelete }: MemberCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteMutation = useDeleteMember();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(member.id);
      onDelete?.();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  return (
    <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-default)] rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* 헤더 - 이름, 파트, 상태 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{member.name}</h3>
            {member.is_leader && (
              <span className="px-2 py-0.5 text-xs font-medium bg-[var(--color-primary-100)] text-[var(--color-primary-700)] rounded">
                리더
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-md border ${PART_COLORS[member.part]}`}>
              {PART_LABELS[member.part]}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-md border ${STATUS_COLORS[member.member_status]}`}>
              {STATUS_LABELS[member.member_status]}
            </span>
          </div>
        </div>
      </div>

      {/* 정보 */}
      <div className="space-y-1 text-sm text-[var(--color-text-secondary)] mb-3">
        {member.joined_date && (
          <div className="flex items-center gap-2">
            <span className="font-medium">임명일:</span>
            <span>{format(new Date(member.joined_date), 'yyyy.MM.dd')}</span>
          </div>
        )}
        {member.phone_number && (
          <div className="flex items-center gap-2">
            <span className="font-medium">연락처:</span>
            <span>{member.phone_number}</span>
          </div>
        )}
        {member.email && (
          <div className="flex items-center gap-2">
            <span className="font-medium">이메일:</span>
            <span className="truncate">{member.email}</span>
          </div>
        )}
        {member.notes && (
          <div className="mt-2 p-2 bg-[var(--color-background-secondary)] rounded text-xs">
            <span className="font-medium">특이사항:</span> {member.notes}
          </div>
        )}
      </div>

      {/* 출석 정보 */}
      <div className="mb-3 p-3 bg-[var(--color-background-secondary)] rounded-lg">
        <div className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">출석 현황</div>
        <div className="grid grid-cols-2 gap-3">
          {/* 최근 등단 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-text-tertiary)] mb-0.5">최근 등단</span>
            {(() => {
              const style = getAttendanceDateStyle(member.last_service_date);
              return (
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-semibold ${style.textClass}`}>
                    {formatAttendanceDate(member.last_service_date)}
                  </span>
                  {style.showWarning && (
                    <AlertTriangle className="w-3 h-3 text-current" />
                  )}
                </div>
              );
            })()}
          </div>
          {/* 최근 연습 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-text-tertiary)] mb-0.5">최근 연습</span>
            {(() => {
              const style = getAttendanceDateStyle(member.last_practice_date);
              return (
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-semibold ${style.textClass}`}>
                    {formatAttendanceDate(member.last_practice_date)}
                  </span>
                  {style.showWarning && (
                    <AlertTriangle className="w-3 h-3 text-current" />
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 휴직 정보 (휴직대원일 때만 표시) */}
      {member.member_status === 'ON_LEAVE' && (
        <div className="mb-3 p-3 bg-[var(--color-warning-50)] border border-[var(--color-warning-200)] rounded-lg">
          <div className="text-xs font-semibold text-[var(--color-warning-700)] mb-2">휴직 정보</div>
          <div className="space-y-1 text-xs text-[var(--color-warning-600)]">
            {member.leave_reason && (
              <div className="flex items-start gap-2">
                <span className="font-medium shrink-0">사유:</span>
                <span>{member.leave_reason}</span>
              </div>
            )}
            {member.leave_start_date && (
              <div className="flex items-center gap-2">
                <span className="font-medium">시작일:</span>
                <span>{format(new Date(member.leave_start_date), 'yyyy.MM.dd')}</span>
              </div>
            )}
            {member.leave_duration_months && (
              <div className="flex items-center gap-2">
                <span className="font-medium">기간:</span>
                <span>{member.leave_duration_months}개월</span>
              </div>
            )}
            {member.expected_return_date && (
              <div className="flex items-center gap-2">
                <span className="font-medium">복직 예정:</span>
                <span className="font-semibold">{format(new Date(member.expected_return_date), 'yyyy.MM.dd')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2 pt-3 border-t border-[var(--color-border-light)]">
        <Link
          href={`/members/${member.id}`}
          className="flex-1 px-3 py-2 text-sm font-medium text-center text-[var(--color-primary-600)] bg-[var(--color-primary-50)] rounded-md hover:bg-[var(--color-primary-100)] transition-colors"
        >
          상세보기
        </Link>
        <Link
          href={`/members/${member.id}/edit`}
          className="flex-1 px-3 py-2 text-sm font-medium text-center text-[var(--color-text-secondary)] bg-[var(--color-background-tertiary)] rounded-md hover:bg-[var(--color-background-secondary)] transition-colors"
        >
          수정
        </Link>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-3 py-2 text-sm font-medium text-[var(--color-error-600)] bg-[var(--color-error-50)] rounded-md hover:bg-[var(--color-error-100)] transition-colors"
          disabled={deleteMutation.isPending}
        >
          삭제
        </button>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-background-primary)] rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">찬양대원 삭제</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              <strong>{member.name}</strong> 찬양대원을 정말 삭제하시겠습니까?
              <br />
              관련된 모든 출석 기록과 자리배치 정보도 함께 삭제됩니다.
            </p>
            {deleteMutation.error && (
              <p className="text-sm text-[var(--color-error-600)] mb-4">{deleteMutation.error.message}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-background-tertiary)] rounded hover:bg-[var(--color-background-secondary)]"
                disabled={deleteMutation.isPending}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[var(--color-error-600)] rounded hover:bg-[var(--color-error-700)] disabled:opacity-50"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MemberCard);
