'use client';

import { format } from 'date-fns/format';
import { ko } from 'date-fns/locale/ko';

import { useEffect, useMemo, useState } from 'react';

import {
  useAttendances,
  useBulkCreateAttendances,
  useBulkUpdateAttendances,
} from '@/hooks/useAttendances';
import { useMembers } from '@/hooks/useMembers';

import { createLogger } from '@/lib/logger';
import { showError } from '@/lib/toast';
import { cn, getPartLabel } from '@/lib/utils';

import { TablesInsert, TablesUpdate } from '@/types/database.types';

const logger = createLogger({ prefix: 'AttendanceInputModal' });

interface AttendanceInputModalProps {
  date: Date;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

interface MemberAttendanceState {
  memberId: string;
  memberName: string;
  part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';
  isAvailable: boolean;
  notes: string;
  existingAttendanceId?: string;
}

export default function AttendanceInputModal({
  date,
  isOpen,
  onClose,
  onSave,
}: AttendanceInputModalProps) {
  const dateString = format(date, 'yyyy-MM-dd');

  // 회원 목록 조회 (활동중인 등단자만 - 지휘자/반주자 제외)
  const { data: membersResponse, isLoading: isMembersLoading } = useMembers({
    member_status: 'REGULAR',
    is_singer: true, // 등단자만 (지휘자/반주자 제외)
    limit: 1000, // 모든 회원 가져오기
  });

  // 해당 날짜의 기존 출석 기록 조회
  const { data: existingAttendances, isLoading: isAttendancesLoading } = useAttendances({
    date: dateString,
  });

  const bulkCreateMutation = useBulkCreateAttendances();
  const bulkUpdateMutation = useBulkUpdateAttendances();

  const [attendanceStates, setAttendanceStates] = useState<MemberAttendanceState[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 회원 목록과 기존 출석 기록을 병합하여 초기 상태 생성
  useEffect(() => {
    if (!membersResponse?.data || !isOpen) return;

    const states: MemberAttendanceState[] = membersResponse.data.map((member) => {
      const existing = existingAttendances?.find((a) => a.member_id === member.id);

      return {
        memberId: member.id,
        memberName: member.name,
        part: member.part,
        isAvailable: existing?.is_service_available ?? true, // 기본값: 출석 가능
        notes: existing?.notes ?? '',
        existingAttendanceId: existing?.id,
      };
    });

    setAttendanceStates(states);
  }, [membersResponse, existingAttendances, isOpen]);

  // 파트별로 그룹화
  const groupedByPart = useMemo(() => {
    const groups: Record<string, MemberAttendanceState[]> = {
      SOPRANO: [],
      ALTO: [],
      TENOR: [],
      BASS: [],
      SPECIAL: [],
    };

    attendanceStates.forEach((state) => {
      groups[state.part].push(state);
    });

    return groups;
  }, [attendanceStates]);

  // 전체 선택/해제
  const handleSelectAll = (isAvailable: boolean) => {
    setAttendanceStates((prev) => prev.map((state) => ({ ...state, isAvailable })));
  };

  // 개별 출석 상태 토글
  const handleToggleAttendance = (memberId: string) => {
    setAttendanceStates((prev) =>
      prev.map((state) =>
        state.memberId === memberId ? { ...state, isAvailable: !state.isAvailable } : state
      )
    );
  };

  // 불참 사유 업데이트
  const handleUpdateNotes = (memberId: string, notes: string) => {
    setAttendanceStates((prev) =>
      prev.map((state) => (state.memberId === memberId ? { ...state, notes } : state))
    );
  };

  // 저장
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 신규 출석 기록 (기존 기록이 없는 것)
      const attendancesToCreate: TablesInsert<'attendances'>[] = attendanceStates
        .filter((state) => !state.existingAttendanceId)
        .map((state) => ({
          member_id: state.memberId,
          date: dateString,
          is_service_available: state.isAvailable,
          notes: state.notes || null,
        }));

      // 기존 출석 기록 업데이트 (변경된 것만)
      const attendancesToUpdate: Array<{ id: string; data: TablesUpdate<'attendances'> }> =
        attendanceStates
          .filter((state) => {
            if (!state.existingAttendanceId) return false;

            // 기존 값과 비교하여 변경된 것만 업데이트
            const existing = existingAttendances?.find((a) => a.id === state.existingAttendanceId);
            if (!existing) return false;

            return (
              existing.is_service_available !== state.isAvailable ||
              (existing.notes ?? '') !== state.notes
            );
          })
          .map((state) => ({
            id: state.existingAttendanceId!,
            data: {
              is_service_available: state.isAvailable,
              notes: state.notes || null,
            },
          }));

      // 병렬로 생성과 업데이트 실행
      const promises: Promise<unknown>[] = [];

      if (attendancesToCreate.length > 0) {
        promises.push(bulkCreateMutation.mutateAsync(attendancesToCreate));
      }

      if (attendancesToUpdate.length > 0) {
        promises.push(bulkUpdateMutation.mutateAsync(attendancesToUpdate));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      onSave?.();
      onClose();
    } catch (error) {
      logger.error('출석 저장 실패:', error);
      showError('출석 기록 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 통계 계산
  const stats = useMemo(() => {
    const available = attendanceStates.filter((s) => s.isAvailable).length;
    const unavailable = attendanceStates.filter((s) => !s.isAvailable).length;
    const total = attendanceStates.length;
    const rate = total > 0 ? Math.round((available / total) * 100) : 0;

    return { available, unavailable, total, rate };
  }, [attendanceStates]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
        {/* 헤더 */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">출석 입력</h2>
              <p className="mt-1 text-sm text-gray-600">
                {format(date, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 transition-colors hover:bg-gray-100"
              aria-label="닫기"
            >
              <svg
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 통계 */}
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">출석:</span>
              <span className="font-semibold text-green-600">{stats.available}명</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">불참:</span>
              <span className="font-semibold text-red-600">{stats.unavailable}명</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">출석률:</span>
              <span className="font-semibold text-indigo-600">{stats.rate}%</span>
            </div>
          </div>

          {/* 전체 선택 버튼 */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleSelectAll(true)}
              className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
            >
              전체 출석
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              전체 불참
            </button>
          </div>
        </div>

        {/* 본문: 회원 목록 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isMembersLoading || isAttendancesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {(['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] as const).map((part) => {
                const members = groupedByPart[part];
                if (members.length === 0) return null;

                return (
                  <div key={part}>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">
                      {getPartLabel(part)} ({members.length}명)
                    </h3>
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div
                          key={member.memberId}
                          className={cn(
                            'flex items-start gap-4 rounded-lg border p-3 transition-colors',
                            member.isAvailable
                              ? 'border-gray-200 bg-white'
                              : 'border-red-200 bg-red-50'
                          )}
                        >
                          {/* 체크박스 */}
                          <div className="flex items-center pt-0.5">
                            <input
                              type="checkbox"
                              checked={member.isAvailable}
                              onChange={() => handleToggleAttendance(member.memberId)}
                              className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </div>

                          {/* 회원 이름 */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'font-medium',
                                  member.isAvailable ? 'text-gray-900' : 'text-gray-600'
                                )}
                              >
                                {member.memberName}
                              </span>
                              {member.existingAttendanceId && (
                                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                  기록됨
                                </span>
                              )}
                            </div>

                            {/* 불참 사유 입력 */}
                            {!member.isAvailable && (
                              <input
                                type="text"
                                value={member.notes}
                                onChange={(e) => handleUpdateNotes(member.memberId, e.target.value)}
                                placeholder="불참 사유 (선택사항)"
                                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터: 액션 버튼 */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || attendanceStates.length === 0}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
