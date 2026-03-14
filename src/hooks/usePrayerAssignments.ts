import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

import type { Database } from '@/types/database.types';

type PrayerAssignment = Database['public']['Tables']['prayer_assignments']['Row'];

export interface PrayerAssignmentFilters {
  quarter?: string;       // "2026-Q1"
  startDate?: string;
  endDate?: string;
}

interface PrayerAssignmentsResponse {
  data: PrayerAssignment[];
  meta: { total: number | null };
}

export interface PrayerAssignmentInput {
  date: string;
  prayer_names: string;
  gown_part: string;
  quarter: string;
}

/**
 * 기도 담당 목록 조회
 */
export function usePrayerAssignments(filters?: PrayerAssignmentFilters) {
  return useQuery({
    queryKey: ['prayer-assignments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.quarter) params.append('quarter', filters.quarter);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/prayers?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '기도 담당 목록을 불러오는데 실패했습니다');
      }

      return response.json() as Promise<PrayerAssignmentsResponse>;
    },
    staleTime: STALE_TIME.EXTRA_LONG,
  });
}

/**
 * 기도 담당 일괄 upsert
 */
export function useBulkUpsertPrayers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignments: PrayerAssignmentInput[]) => {
      const response = await fetch('/api/prayers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '일괄 저장에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-assignments'] });
    },
  });
}

/**
 * 기도 담당 단건 수정
 */
export function useUpdatePrayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PrayerAssignmentInput> }) => {
      const response = await fetch(`/api/prayers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '기도 담당 수정에 실패했습니다');
      }

      return response.json() as Promise<PrayerAssignment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-assignments'] });
    },
  });
}

/**
 * 기도 담당 단건 삭제
 */
export function useDeletePrayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/prayers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '기도 담당 삭제에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-assignments'] });
    },
  });
}
