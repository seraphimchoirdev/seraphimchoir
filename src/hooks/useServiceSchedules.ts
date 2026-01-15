import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/constants';
import type { Database } from '@/types/database.types';

type ServiceSchedule = Database['public']['Tables']['service_schedules']['Row'];
type ServiceScheduleInsert = Database['public']['Tables']['service_schedules']['Insert'];
type ServiceScheduleUpdate = Database['public']['Tables']['service_schedules']['Update'];

export interface ServiceScheduleFilters {
  year?: number;
  quarter?: number; // 1-4
  startDate?: string;
  endDate?: string;
  date?: string; // 단일 날짜
}

interface ServiceSchedulesResponse {
  data: ServiceSchedule[];
  meta: { total: number | null };
}

/**
 * 예배 일정 목록 조회
 */
export function useServiceSchedules(filters?: ServiceScheduleFilters) {
  return useQuery({
    queryKey: ['service-schedules', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.year) params.append('year', filters.year.toString());
      if (filters?.quarter) params.append('quarter', filters.quarter.toString());
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.date) params.append('date', filters.date);

      const response = await fetch(`/api/service-schedules?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '예배 일정 목록을 불러오는데 실패했습니다');
      }

      return response.json() as Promise<ServiceSchedulesResponse>;
    },
    staleTime: STALE_TIME.EXTRA_LONG, // 10분 // 10분 (예배 일정은 자주 변경되지 않음)
  });
}

/**
 * 특정 날짜의 예배 일정 조회 (arrangements 연동용)
 */
export function useServiceScheduleByDate(date: string | undefined) {
  return useQuery({
    queryKey: ['service-schedules', 'by-date', date],
    queryFn: async () => {
      if (!date) return null;

      const response = await fetch(`/api/service-schedules?date=${date}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '예배 일정을 불러오는데 실패했습니다');
      }

      const result = (await response.json()) as ServiceSchedulesResponse;
      return result.data[0] || null; // 단일 날짜이므로 첫 번째 결과
    },
    enabled: !!date,
    staleTime: STALE_TIME.EXTRA_LONG, // 10분
  });
}

/**
 * 예배 일정 단일 조회
 */
export function useServiceSchedule(id: string | undefined) {
  return useQuery({
    queryKey: ['service-schedules', id],
    queryFn: async () => {
      if (!id) throw new Error('ID가 필요합니다');

      const response = await fetch(`/api/service-schedules/${id}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '예배 일정을 불러오는데 실패했습니다');
      }

      return response.json() as Promise<ServiceSchedule>;
    },
    enabled: !!id,
    staleTime: STALE_TIME.EXTRA_LONG, // 10분
  });
}

/**
 * 예배 일정 생성
 */
export function useCreateServiceSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ServiceScheduleInsert) => {
      const response = await fetch('/api/service-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '예배 일정 생성에 실패했습니다');
      }

      return response.json() as Promise<ServiceSchedule>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-schedules'] });
    },
  });
}

/**
 * 예배 일정 수정
 */
export function useUpdateServiceSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ServiceScheduleUpdate;
    }) => {
      const response = await fetch(`/api/service-schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '예배 일정 수정에 실패했습니다');
      }

      return response.json() as Promise<ServiceSchedule>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-schedules'] });
      queryClient.invalidateQueries({
        queryKey: ['service-schedules', variables.id],
      });
    },
  });
}

/**
 * 예배 일정 삭제
 */
export function useDeleteServiceSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/service-schedules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '예배 일정 삭제에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-schedules'] });
    },
  });
}

/**
 * 예배 일정 일괄 생성/수정 (upsert)
 */
export function useBulkUpsertServiceSchedules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedules: ServiceScheduleInsert[]) => {
      const response = await fetch('/api/service-schedules/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '일괄 저장에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-schedules'] });
    },
  });
}
