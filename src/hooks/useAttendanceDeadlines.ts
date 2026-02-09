import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

import type { Tables } from '@/types/database.types';

type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';

/** 준비 완료 대상 파트 (SPECIAL 제외) */
export const READINESS_PARTS: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS'];

// 준비 완료 레코드 타입
export type AttendanceDeadline = Tables<'attendance_deadlines'> & {
  closer?: {
    id: string;
    name: string;
    email: string;
  };
};

// API 응답 타입
export interface DeadlinesResponse {
  date: string;
  partDeadlines: Record<Part, AttendanceDeadline | null>;
  fullDeadline: AttendanceDeadline | null;
  isFullyClosed: boolean;
}

/**
 * 특정 날짜의 준비 완료 상태 조회 훅
 * @param date - 조회할 날짜 (YYYY-MM-DD)
 */
export function useAttendanceDeadlines(date: string | undefined) {
  return useQuery<DeadlinesResponse>({
    queryKey: ['attendanceDeadlines', date],
    queryFn: async () => {
      if (!date) throw new Error('날짜가 필요합니다');

      const response = await fetch(`/api/attendances/deadlines?date=${date}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '준비 현황을 불러오는데 실패했습니다');
      }
      return response.json();
    },
    enabled: !!date,
    staleTime: STALE_TIME.SHORT, // 30초
  });
}

/**
 * 파트별 준비 완료 처리 뮤테이션 훅
 */
export function useCloseAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, part }: { date: string; part?: Part | null }) => {
      const body: { date: string; part?: Part | null } = { date };
      if (part !== undefined) {
        body.part = part;
      }

      const response = await fetch('/api/attendances/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '준비 완료 처리에 실패했습니다');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attendanceDeadlines', variables.date],
      });
    },
  });
}

/**
 * 준비 완료 해제 뮤테이션 훅
 */
export function useReopenAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, date: _date }: { id: string; date: string }) => {
      const response = await fetch(`/api/attendances/deadlines/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '준비 완료 해제에 실패했습니다');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attendanceDeadlines', variables.date],
      });
    },
  });
}

/**
 * 파트별 준비 완료 토글 훅 (마크/언마크 통합)
 */
export function useToggleReadiness() {
  const queryClient = useQueryClient();
  const closeMutation = useCloseAttendance();
  const reopenMutation = useReopenAttendance();

  const toggleReadiness = async (params: {
    date: string;
    part: Part;
    currentDeadline: AttendanceDeadline | null;
  }) => {
    if (params.currentDeadline) {
      await reopenMutation.mutateAsync({
        id: params.currentDeadline.id,
        date: params.date,
      });
    } else {
      await closeMutation.mutateAsync({
        date: params.date,
        part: params.part,
      });
    }
    // mutation onSuccess의 invalidate와 별개로, 리페치 완료를 명시적으로 보장
    await queryClient.invalidateQueries({
      queryKey: ['attendanceDeadlines', params.date],
    });
  };

  return {
    toggleReadiness,
    isPending: closeMutation.isPending || reopenMutation.isPending,
  };
}

/**
 * 준비 완료 상태 헬퍼 함수들 (SPECIAL 제외)
 */
export function isPartReady(deadlines: DeadlinesResponse | undefined, part: Part): boolean {
  return deadlines?.partDeadlines?.[part] !== null;
}

export function areAllPartsReady(deadlines: DeadlinesResponse | undefined): boolean {
  if (!deadlines?.partDeadlines) return false;

  return READINESS_PARTS.every((part) => deadlines.partDeadlines[part] !== null);
}

export function getReadyPartsCount(deadlines: DeadlinesResponse | undefined): number {
  if (!deadlines?.partDeadlines) return 0;

  return READINESS_PARTS.filter((part) => deadlines.partDeadlines[part] !== null).length;
}

// 하위 호환용 별칭
export const isPartClosed = isPartReady;
export const areAllPartsClosed = areAllPartsReady;
export const getClosedPartsCount = getReadyPartsCount;
