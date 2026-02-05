import { format, isSunday } from 'date-fns';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

export type AttendanceMode =
  | 'service-entry'    // 예배 등단 출석 관리 (주중)
  | 'practice'         // 예배 후 연습 출석 관리 (예배 당일)
  | 'both';            // 둘 다 표시 (ADMIN/CONDUCTOR만)

export type AttendanceLockStatus = {
  isServiceEntryLocked: boolean;  // 예배 등단 탭 잠금 여부
  isPracticeLocked: boolean;      // 예배 후 연습 탭 잠금 여부
  lockReason?: string;            // 잠금 사유
};

interface UseAttendanceModeOptions {
  date: Date;
  serviceScheduleId?: string;
}

/**
 * 출석 관리 모드 및 잠금 상태를 계산하는 훅
 *
 * ## 모드 결정 로직
 * 1. ADMIN/CONDUCTOR: 항상 모든 탭 접근 가능
 * 2. 주일(예배 당일) 09:00 이후: practice 모드 (예배 후 연습 탭만)
 * 3. 그 외: service-entry 모드 (예배 등단 탭만)
 *
 * ## 잠금 로직
 * - 자리배치표 상태가 CONFIRMED인 경우 예배 등단 탭 잠금
 */
export function useAttendanceMode({ date, serviceScheduleId }: UseAttendanceModeOptions) {
  const { hasRole } = useAuth();
  const dateStr = format(date, 'yyyy-MM-dd');

  // 자리배치표 상태 조회 (service_schedule_id 기준, 없으면 date 기준)
  const { data: arrangementStatus, isLoading } = useQuery({
    queryKey: ['arrangement-status', serviceScheduleId || dateStr],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('arrangements')
        .select('status');

      if (serviceScheduleId) {
        query = query.eq('service_schedule_id', serviceScheduleId);
      } else {
        query = query.eq('date', dateStr);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data?.status as 'DRAFT' | 'SHARED' | 'CONFIRMED' | null;
    },
  });

  // 현재 시간대 기반 모드 계산
  const mode = useMemo((): AttendanceMode => {
    // ADMIN/CONDUCTOR는 항상 모든 탭 접근 가능
    if (hasRole(['ADMIN', 'CONDUCTOR'])) {
      return 'both';
    }

    const now = new Date();
    const targetDateStart = new Date(date);
    targetDateStart.setHours(9, 0, 0, 0); // 주일 09:00

    // 주일 당일 09:00 이후라면 practice 모드
    if (
      isSunday(now) &&
      format(now, 'yyyy-MM-dd') === dateStr &&
      now >= targetDateStart
    ) {
      return 'practice';
    }

    // 그 외에는 service-entry 모드
    return 'service-entry';
  }, [date, dateStr, hasRole]);

  // 잠금 상태 계산
  const lockStatus = useMemo((): AttendanceLockStatus => {
    const isConfirmed = arrangementStatus === 'CONFIRMED';

    return {
      isServiceEntryLocked: isConfirmed,
      isPracticeLocked: false, // 예배 후 연습은 항상 수정 가능
      lockReason: isConfirmed
        ? '자리배치표가 확정되어 예배 등단 출석을 수정할 수 없습니다.'
        : undefined,
    };
  }, [arrangementStatus]);

  return {
    mode,
    lockStatus,
    isLoading,
  };
}
