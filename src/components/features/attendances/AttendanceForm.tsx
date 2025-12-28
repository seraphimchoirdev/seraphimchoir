'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateAttendance, useUpdateAttendance } from '@/hooks/useAttendances';
import { useMembers } from '@/hooks/useMembers';
import { Tables } from '@/types/database.types';

interface AttendanceFormProps {
  attendance?: Tables<'attendances'>;
  memberId?: string; // 특정 찬양대원에 대한 출석 기록 생성 시
  defaultDate?: string; // 기본 날짜 (YYYY-MM-DD)
}

export default function AttendanceForm({
  attendance,
  memberId: initialMemberId,
  defaultDate,
}: AttendanceFormProps) {
  const router = useRouter();
  const isEditMode = !!attendance;

  // Form state
  const [memberId, setMemberId] = useState(
    attendance?.member_id || initialMemberId || ''
  );
  const [date, setDate] = useState(
    attendance?.date || defaultDate || new Date().toISOString().split('T')[0]
  );
  const [isAvailable, setIsAvailable] = useState(
    attendance?.is_service_available !== undefined ? attendance.is_service_available : true
  );
  const [notes, setNotes] = useState(attendance?.notes || '');
  const [error, setError] = useState('');

  // Mutations
  const createMutation = useCreateAttendance();
  const updateMutation = useUpdateAttendance();

  // 찬양대원 목록 조회 (선택 옵션용)
  const { data: members, isLoading: membersLoading } = useMembers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!memberId) {
      setError('찬양대원을 선택해주세요');
      return;
    }

    if (!date) {
      setError('날짜를 선택해주세요');
      return;
    }

    try {
      if (isEditMode && attendance) {
        await updateMutation.mutateAsync({
          id: attendance.id,
          data: {
            date,
            is_service_available: isAvailable,
            notes: notes || null,
          },
        });
      } else {
        await createMutation.mutateAsync({
          member_id: memberId,
          date,
          is_service_available: isAvailable,
          notes: notes || null,
        });
      }

      // 성공 시 뒤로 가기
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : '출석 기록 저장에 실패했습니다');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 찬양대원 선택 */}
      <div>
        <label htmlFor="member_id" className="block text-sm font-medium text-gray-700 mb-1">
          찬양대원 <span className="text-red-500">*</span>
        </label>
        {isEditMode || initialMemberId ? (
          // 수정 모드이거나 특정 찬양대원이 지정된 경우 선택 비활성화
          <input
            type="text"
            disabled
            value={
              members?.data?.find((m) => m.id === memberId)?.name || '찬양대원 정보 없음'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
          />
        ) : (
          <select
            id="member_id"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            disabled={membersLoading}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">찬양대원을 선택하세요</option>
            {members?.data?.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.part})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 날짜 */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          날짜 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* 출석 가능 여부 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          출석 가능 여부 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="is_available"
              checked={isAvailable === true}
              onChange={() => setIsAvailable(true)}
              className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">출석 가능</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="is_available"
              checked={isAvailable === false}
              onChange={() => setIsAvailable(false)}
              className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">불참</span>
          </label>
        </div>
      </div>

      {/* 비고 (불참 이유 등) */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          비고 {!isAvailable && <span className="text-gray-500">(불참 이유 등)</span>}
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={
            isAvailable
              ? '특이사항을 입력하세요 (선택사항)'
              : '불참 이유를 입력하세요 (선택사항)'
          }
        />
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '저장 중...' : isEditMode ? '수정' : '등록'}
        </button>
      </div>
    </form>
  );
}
