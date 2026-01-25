'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useCreateAttendance, useUpdateAttendance } from '@/hooks/useAttendances';
import { useMembers } from '@/hooks/useMembers';

import { showError, showSuccess } from '@/lib/toast';

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
  const [memberId, setMemberId] = useState(attendance?.member_id || initialMemberId || '');
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
        showSuccess('출석 기록이 수정되었습니다.');
      } else {
        await createMutation.mutateAsync({
          member_id: memberId,
          date,
          is_service_available: isAvailable,
          notes: notes || null,
        });
        showSuccess('출석 기록이 등록되었습니다.');
      }

      // 성공 시 뒤로 가기
      router.back();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '출석 기록 저장에 실패했습니다';
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 찬양대원 선택 */}
      <div>
        <label htmlFor="member_id" className="mb-1 block text-sm font-medium text-gray-700">
          찬양대원 <span className="text-red-500">*</span>
        </label>
        {isEditMode || initialMemberId ? (
          // 수정 모드이거나 특정 찬양대원이 지정된 경우 선택 비활성화
          <input
            type="text"
            disabled
            value={members?.data?.find((m) => m.id === memberId)?.name || '찬양대원 정보 없음'}
            className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-700"
          />
        ) : (
          <select
            id="member_id"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            disabled={membersLoading}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
        <label htmlFor="date" className="mb-1 block text-sm font-medium text-gray-700">
          날짜 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      {/* 출석 가능 여부 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          출석 가능 여부 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center">
            <input
              type="radio"
              name="is_available"
              checked={isAvailable === true}
              onChange={() => setIsAvailable(true)}
              className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">출석 가능</span>
          </label>
          <label className="flex cursor-pointer items-center">
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
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
          비고 {!isAvailable && <span className="text-gray-500">(불참 이유 등)</span>}
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          placeholder={
            isAvailable ? '특이사항을 입력하세요 (선택사항)' : '불참 이유를 입력하세요 (선택사항)'
          }
        />
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? '저장 중...' : isEditMode ? '수정' : '등록'}
        </button>
      </div>
    </form>
  );
}
