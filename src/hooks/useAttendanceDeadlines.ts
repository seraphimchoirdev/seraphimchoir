import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

import type { Tables } from '@/types/database.types';

type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';

// 마감 레코드 타입
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
 * 특정 날짜의 마감 상태 조회 훅
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
        throw new Error(error.error || '마감 상태를 불러오는데 실패했습니다');
      }
      return response.json();
    },
    enabled: !!date,
    staleTime: STALE_TIME.SHORT, // 30초
  });
}

/**
 * 파트/전체 마감 처리 뮤테이션 훅
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
        throw new Error(error.error || '마감 처리에 실패했습니다');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // 마감 상태 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: ['attendanceDeadlines', variables.date],
      });
    },
  });
}

/**
 * 마감 해제 뮤테이션 훅
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
        throw new Error(error.error || '마감 해제에 실패했습니다');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // 마감 상태 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: ['attendanceDeadlines', variables.date],
      });
    },
  });
}

/**
 * 마감 상태 헬퍼 함수들
 */
export function isPartClosed(deadlines: DeadlinesResponse | undefined, part: Part): boolean {
  return deadlines?.partDeadlines?.[part] !== null;
}

export function areAllPartsClosed(deadlines: DeadlinesResponse | undefined): boolean {
  if (!deadlines?.partDeadlines) return false;

  const parts: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];
  return parts.every((part) => deadlines.partDeadlines[part] !== null);
}

export function getClosedPartsCount(deadlines: DeadlinesResponse | undefined): number {
  if (!deadlines?.partDeadlines) return 0;

  return Object.values(deadlines.partDeadlines).filter((d) => d !== null).length;
}
