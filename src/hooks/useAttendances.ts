import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Tables, TablesInsert, TablesUpdate } from '@/types/database.types';

// React Query stale time 설정
// 출석 데이터는 실시간으로 변경될 수 있으므로 짧은 stale time 사용
const STALE_TIME = {
  ATTENDANCES_LIST: 1000 * 30, // 30초 - 여러 사용자가 동시에 수정할 수 있음
  ATTENDANCE_DETAIL: 1000 * 30, // 30초
} as const;

// Attendance 타입 정의 (members 조인 포함)
export type Attendance = Tables<'attendances'> & {
  members: {
    id: string;
    name: string;
    part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';
  };
};

// 필터 타입 정의
export interface AttendanceFilters {
  member_id?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  is_available?: boolean; // backward compatibility
  is_service_available?: boolean;
  is_practice_attended?: boolean;
  /** 탭 포커스 시 자동 갱신 (긴급 모드에서 출석 변경 반영용) */
  refetchOnWindowFocus?: boolean;
}

/**
 * 출석 현황 목록 조회 훅
 * @param filters - 필터링 옵션
 */
export function useAttendances(filters?: AttendanceFilters) {
  // refetchOnWindowFocus는 React Query 옵션이므로 API 파라미터에서 제외
  const { refetchOnWindowFocus, ...apiFilters } = filters || {};

  return useQuery<Attendance[]>({
    queryKey: ['attendances', apiFilters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (apiFilters?.member_id) params.append('member_id', apiFilters.member_id);
      if (apiFilters?.date) params.append('date', apiFilters.date);
      if (apiFilters?.start_date) params.append('start_date', apiFilters.start_date);
      if (apiFilters?.end_date) params.append('end_date', apiFilters.end_date);
      if (apiFilters?.is_available !== undefined) {
        params.append('is_available', apiFilters.is_available.toString());
      }
      if (apiFilters?.is_service_available !== undefined) {
        params.append('is_service_available', apiFilters.is_service_available.toString());
      }
      if (apiFilters?.is_practice_attended !== undefined) {
        params.append('is_practice_attended', apiFilters.is_practice_attended.toString());
      }

      const response = await fetch(`/api/attendances?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '출석 현황을 불러오는데 실패했습니다');
      }
      return response.json();
    },
    staleTime: STALE_TIME.ATTENDANCES_LIST,
    // 긴급 모드에서 탭 포커스 시 자동 갱신 (출석 관리 변경사항 반영)
    refetchOnWindowFocus: refetchOnWindowFocus ?? false,
  });
}

/**
 * 특정 출석 기록 조회 훅
 * @param id - 출석 기록 ID
 */
export function useAttendance(id: string | undefined) {
  return useQuery<Attendance>({
    queryKey: ['attendance', id],
    queryFn: async () => {
      if (!id) throw new Error('ID가 필요합니다');

      const response = await fetch(`/api/attendances/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '출석 기록을 불러오는데 실패했습니다');
      }
      return response.json();
    },
    enabled: !!id,
    staleTime: STALE_TIME.ATTENDANCE_DETAIL,
  });
}

/**
 * 출석 기록 생성 훅
 */
export function useCreateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<'attendances'>) => {
      const response = await fetch('/api/attendances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '출석 기록 생성에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      // 출석 현황 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });
}

/**
 * 출석 기록 수정 훅
 */
export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TablesUpdate<'attendances'> }) => {
      const response = await fetch(`/api/attendances/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '출석 기록 수정에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // 특정 출석 기록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['attendance', variables.id] });
      // 출석 현황 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });
}

/**
 * 출석 기록 삭제 훅
 */
export function useDeleteAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/attendances/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '출석 기록 삭제에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      // 출석 현황 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });
}

/**
 * 일괄 출석 기록 생성 훅 (여러 찬양대원의 출석을 한 번에 등록)
 * Batch API를 사용하여 성능 최적화
 */
export function useBulkCreateAttendances() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendances: TablesInsert<'attendances'>[]) => {
      const response = await fetch('/api/attendances/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attendances }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '출석 기록 일괄 생성에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });
}

/**
 * 일괄 출석 기록 수정 훅 (여러 출석 기록을 한 번에 수정)
 * Batch API를 사용하여 성능 최적화
 */
export function useBulkUpdateAttendances() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: Array<{
        id: string;
        data: TablesUpdate<'attendances'>;
      }>
    ) => {
      const response = await fetch('/api/attendances/batch', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates: updates.map((u) => ({ id: u.id, ...u.data })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '출석 기록 일괄 수정에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });
}
