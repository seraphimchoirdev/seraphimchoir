'use client';

import Link from 'next/link';
import { useDeleteMember } from '@/hooks/useMembers';
import type { Database } from '@/types/database.types';
import { useState } from 'react';

type Member = Database['public']['Tables']['members']['Row'];
type Part = Database['public']['Enums']['part'];
type MemberStatus = Database['public']['Enums']['member_status'];

interface MemberCardProps {
  member: Member;
  onDelete?: () => void;
}

// 파트별 색상 (UXUI_DESIGN_SYSTEM.md 기준)
const PART_COLORS: Partial<Record<Part, string>> = {
  SOPRANO: 'bg-purple-50 text-purple-600 border-purple-400',
  ALTO: 'bg-yellow-50 text-yellow-600 border-yellow-400',
  TENOR: 'bg-blue-50 text-blue-600 border-blue-400',
  BASS: 'bg-green-50 text-green-600 border-green-500',
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
  REGULAR: 'bg-green-100 text-green-800 border-green-300',
  NEW: 'bg-blue-100 text-blue-800 border-blue-300',
  ON_LEAVE: 'bg-gray-100 text-gray-800 border-gray-300',
  RESIGNED: 'bg-red-100 text-red-800 border-red-300',
};

export default function MemberCard({ member, onDelete }: MemberCardProps) {
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
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* 헤더 - 이름, 파트, 상태 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
            {member.is_leader && (
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
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
      <div className="space-y-1 text-sm text-gray-600 mb-3">
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
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
            <span className="font-medium">특이사항:</span> {member.notes}
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <Link
          href={`/members/${member.id}`}
          className="flex-1 px-3 py-2 text-sm font-medium text-center text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
        >
          상세보기
        </Link>
        <Link
          href={`/members/${member.id}/edit`}
          className="flex-1 px-3 py-2 text-sm font-medium text-center text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          수정
        </Link>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
          disabled={deleteMutation.isPending}
        >
          삭제
        </button>
      </div>

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
