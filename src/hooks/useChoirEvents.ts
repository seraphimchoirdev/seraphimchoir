/**
 * useChoirEvents Hook
 *
 * 찬양대 행사(choir_events) 관련 React Query 훅
 * - 행사 목록 조회 (분기별/기간별)
 * - 행사 단일 조회
 * - 행사 생성/수정/삭제
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

type ChoirEvent = Database['public']['Tables']['choir_events']['Row'];
type ChoirEventInsert = Database['public']['Tables']['choir_events']['Insert'];
type ChoirEventUpdate = Database['public']['Tables']['choir_events']['Update'];

// 행사 유형 상수
export const EVENT_TYPES = {
  FELLOWSHIP: 'FELLOWSHIP',      // 야유회/수련회 (친목)
  PERFORMANCE: 'PERFORMANCE',    // 찬양발표회/정기연주회
  CHURCH_EVENT: 'CHURCH_EVENT',  // 교회 전체 행사 (부활절, 성탄절 등)
  OTHER: 'OTHER',                // 기타
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  FELLOWSHIP: '친목 행사',
  PERFORMANCE: '공연/발표회',
  CHURCH_EVENT: '교회 행사',
  OTHER: '기타',
};

export interface ChoirEventFilters {
  year?: number;
  quarter?: number; // 1-4
  startDate?: string;
  endDate?: string;
  eventType?: EventType;
}

/**
 * 분기 시작/종료 날짜 계산
 */
function getQuarterDateRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3;
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, startMonth + 3, 0);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * 행사 목록 조회
 */
export function useChoirEvents(filters?: ChoirEventFilters) {
  return useQuery({
    queryKey: ['choir-events', filters],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from('choir_events')
        .select('*')
        .order('date', { ascending: true });

      // 분기 필터
      if (filters?.year && filters?.quarter) {
        const { startDate, endDate } = getQuarterDateRange(
          filters.year,
          filters.quarter
        );
        query = query.gte('date', startDate).lte('date', endDate);
      } else {
        // 날짜 범위 필터
        if (filters?.startDate) {
          query = query.gte('date', filters.startDate);
        }
        if (filters?.endDate) {
          query = query.lte('date', filters.endDate);
        }
      }

      // 행사 유형 필터
      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        meta: { total: count },
      };
    },
    staleTime: 1000 * 60 * 10, // 10분
  });
}

/**
 * 행사 단일 조회
 */
export function useChoirEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['choir-events', id],
    queryFn: async () => {
      if (!id) throw new Error('ID가 필요합니다');

      const supabase = createClient();
      const { data, error } = await supabase
        .from('choir_events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * 행사 생성
 */
export function useCreateChoirEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ChoirEventInsert) => {
      const supabase = createClient();
      const { data: created, error } = await supabase
        .from('choir_events')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['choir-events'] });
    },
  });
}

/**
 * 행사 수정
 */
export function useUpdateChoirEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ChoirEventUpdate;
    }) => {
      const supabase = createClient();
      const { data: updated, error } = await supabase
        .from('choir_events')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['choir-events'] });
      queryClient.invalidateQueries({
        queryKey: ['choir-events', variables.id],
      });
    },
  });
}

/**
 * 행사 삭제
 */
export function useDeleteChoirEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('choir_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['choir-events'] });
    },
  });
}

// 타입 export
export type { ChoirEvent, ChoirEventInsert, ChoirEventUpdate };
