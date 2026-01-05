'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns/format';
import { useMember, useDeleteMember } from '@/hooks/useMembers';
import type { Database } from '@/types/database.types';
import { useState } from 'react';
import ConductorNotes from './ConductorNotes';

type Part = Database['public']['Enums']['part'];
type MemberStatus = Database['public']['Enums']['member_status'];

interface MemberDetailProps {
  memberId: string;
}

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

export default function MemberDetail({ memberId }: MemberDetailProps) {
  const router = useRouter();
  const { data, isLoading, error } = useMember(memberId);
  const deleteMutation = useDeleteMember();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const member = data?.data;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(memberId);
      router.push('/members');
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="mt-2 text-sm text-gray-600">로딩 중...</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">
          {error?.message || '찬양대원 정보를 불러오는데 실패했습니다.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{member.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-800 rounded">
                {PART_LABELS[member.part]}
              </span>
              <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded">
                {STATUS_LABELS[member.member_status]}
              </span>
              {member.is_leader && (
                <span className="px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded">
                  리더
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/members/${member.id}/edit`}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
            >
              수정
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
            >
              삭제
            </button>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">파트</h3>
            <p className="mt-1 text-base text-gray-900">{PART_LABELS[member.part]}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">대원 상태</h3>
            <p className="mt-1 text-base text-gray-900">{STATUS_LABELS[member.member_status]}</p>
          </div>
          {member.phone_number && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">연락처</h3>
              <p className="mt-1 text-base text-gray-900">{member.phone_number}</p>
            </div>
          )}
          {member.email && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">이메일</h3>
              <p className="mt-1 text-base text-gray-900">{member.email}</p>
            </div>
          )}
        </div>

        {/* 휴직 정보 (휴직대원일 때만 표시) */}
        {member.member_status === 'ON_LEAVE' && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              휴직 정보
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {member.leave_reason && (
                <div className="md:col-span-2">
                  <h4 className="text-xs font-medium text-amber-700">휴직 사유</h4>
                  <p className="mt-1 text-sm text-amber-900">{member.leave_reason}</p>
                </div>
              )}
              {member.leave_start_date && (
                <div>
                  <h4 className="text-xs font-medium text-amber-700">휴직 시작일</h4>
                  <p className="mt-1 text-sm text-amber-900">
                    {format(new Date(member.leave_start_date), 'yyyy년 MM월 dd일')}
                  </p>
                </div>
              )}
              {member.leave_duration_months && (
                <div>
                  <h4 className="text-xs font-medium text-amber-700">휴직 기간</h4>
                  <p className="mt-1 text-sm text-amber-900">{member.leave_duration_months}개월</p>
                </div>
              )}
              {member.expected_return_date && (
                <div>
                  <h4 className="text-xs font-medium text-amber-700">복직 예정일</h4>
                  <p className="mt-1 text-sm font-semibold text-amber-900">
                    {format(new Date(member.expected_return_date), 'yyyy년 MM월 dd일')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 특이사항 */}
        {member.notes && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500">특이사항</h3>
            <p className="mt-1 text-base text-gray-900 whitespace-pre-wrap">{member.notes}</p>
          </div>
        )}

        {/* 생성/수정 일시 */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-xs text-gray-500">
          <p>생성일: {new Date(member.created_at).toLocaleString('ko-KR')}</p>
          <p>수정일: {new Date(member.updated_at).toLocaleString('ko-KR')}</p>
        </div>
      </div>

      {/* 지휘자 전용 메모 */}
      <ConductorNotes memberId={member.id} memberName={member.name} />

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">찬양대원 삭제</h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{member.name}</strong> 찬양대원을 정말 삭제하시겠습니까?
              <br />
              관련된 모든 출석 기록과 자리배치 정보도 함께 삭제됩니다.
            </p>
            {deleteMutation.error && (
              <p className="text-sm text-red-600 mb-4">{deleteMutation.error.message}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                disabled={deleteMutation.isPending}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
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
