import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

import type { Tables } from '@/types/database.types';

type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';

// 준비 완료(마감) 레코드 타입 — 출석관리 페이지의 잠금 오버레이 판정에 사용
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
  hasArrangement: boolean;
}

/**
 * 특정 날짜의 마감(준비 완료) 상태 조회 훅
 *
 * 자동 markReady/토글 mutation은 자동 체크 회귀 방지를 위해 제거됨.
 * 현재는 AttendanceList의 잠금 오버레이 판정 용도로만 GET 응답을 사용한다.
 *
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
        throw new Error(error.error || '마감 현황을 불러오는데 실패했습니다');
      }
      return response.json();
    },
    enabled: !!date,
    staleTime: STALE_TIME.SHORT, // 30초
  });
}
