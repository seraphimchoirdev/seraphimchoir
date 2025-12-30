'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import MemberAvatar from './MemberAvatar';
import { useDeleteMember } from '@/hooks/useMembers';
import type { Database } from '@/types/database.types';

type Member = Database['public']['Tables']['members']['Row'];
type Part = Database['public']['Enums']['part'];
type MemberStatus = Database['public']['Enums']['member_status'];

interface MemberTableProps {
  members: Member[];
  onRefetch?: () => void;
}

// 파트별 색상 (UXUI_DESIGN_SYSTEM.md 기준)
const PART_COLORS: Partial<Record<Part, { bg: string; text: string; border: string }>> = {
  SOPRANO: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-400' },
  ALTO: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-400' },
  TENOR: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-400' },
  BASS: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-500' },
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

/**
 * MemberTable 컴포넌트
 * 데스크톱에서 사용하는 테이블 형태의 찬양대원 목록
 */
export default function MemberTable({ members, onRefetch }: MemberTableProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const deleteMutation = useDeleteMember();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      onRefetch?.();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

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
                className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wider"
              >
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {members.map((member) => (
              <tr
                key={member.id}
                className="group hover:bg-neutral-50 transition-colors"
              >
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
                      ${PART_COLORS[member.part]?.bg || 'bg-gray-50'}
                      ${PART_COLORS[member.part]?.text || 'text-gray-600'}
                      ${PART_COLORS[member.part]?.border || 'border-gray-400'}
                    `}
                  >
                    {PART_LABELS[member.part] || member.part}
                  </span>
                </td>

                {/* 역할 */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {member.is_leader ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                      파트장
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-500">대원</span>
                  )}
                </td>

                {/* 상태 */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <span
                    className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border
                      ${STATUS_COLORS[member.member_status]}
                    `}
                  >
                    {STATUS_LABELS[member.member_status]}
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
                      onClick={() => setDeleteConfirmId(member.id)}
                      className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      aria-label="삭제"
                      title="삭제"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              찬양대원 삭제
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              <strong>
                {members.find((m) => m.id === deleteConfirmId)?.name}
              </strong>{' '}
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
                onClick={() => setDeleteConfirmId(null)}
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
    </>
  );
}
