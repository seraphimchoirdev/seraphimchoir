/**
 * useVoteDeadlines Hook
 *
 * 등단 투표 마감 시간 관련 React Query 훅
 * - 마감 시간 조회
 * - 마감 시간 설정/수정
 * - 마감 여부 확인
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';

interface VoteDeadline {
  id: string;
  service_date: string;
  deadline_at: string;
  created_by: string | null;
  created_at: string;
}

interface UpcomingDeadline {
  service_date: string;
  deadline_at: string;
  is_passed: boolean;
}

// 특정 날짜의 마감 정보 조회
export function useVoteDeadline(serviceDate: string) {
  return useQuery({
    queryKey: ['vote-deadline', serviceDate],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('attendance_vote_deadlines')
        .select('*')
        .eq('service_date', serviceDate)
        .maybeSingle();

      if (error) throw error;

      return data as VoteDeadline | null;
    },
    enabled: !!serviceDate,
  });
}

// 마감 시간 목록 조회 (관리용)
export function useVoteDeadlines(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['vote-deadlines', startDate, endDate],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from('attendance_vote_deadlines')
        .select('*')
        .order('service_date', { ascending: false });

      if (startDate) {
        query = query.gte('service_date', startDate);
      }
      if (endDate) {
        query = query.lte('service_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as VoteDeadline[];
    },
  });
}

// 다가오는 마감 조회 (RPC 함수 사용)
export function useUpcomingVoteDeadlines(limit: number = 5) {
  return useQuery({
    queryKey: ['upcoming-vote-deadlines', limit],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('get_upcoming_vote_deadlines', {
        limit_count: limit,
      });

      if (error) throw error;

      return data as UpcomingDeadline[];
    },
  });
}

// 특정 날짜 마감 여부 확인
export function useIsVoteDeadlinePassed(serviceDate: string) {
  return useQuery({
    queryKey: ['vote-deadline-passed', serviceDate],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('is_vote_deadline_passed', {
        target_date: serviceDate,
      });

      if (error) throw error;

      return data as boolean;
    },
    enabled: !!serviceDate,
  });
}

// 마감 시간 설정/수정
export function useSetVoteDeadline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceDate,
      deadlineAt,
    }: {
      serviceDate: string;
      deadlineAt: string;
    }) => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('attendance_vote_deadlines')
        .upsert(
          {
            service_date: serviceDate,
            deadline_at: deadlineAt,
            created_by: user?.id,
          },
          {
            onConflict: 'service_date',
          }
        )
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vote-deadline', variables.serviceDate] });
      queryClient.invalidateQueries({ queryKey: ['vote-deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-vote-deadlines'] });
    },
  });
}

// 마감 시간 삭제
export function useDeleteVoteDeadline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceDate: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from('attendance_vote_deadlines')
        .delete()
        .eq('service_date', serviceDate);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vote-deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-vote-deadlines'] });
    },
  });
}

// 기본 마감 시간 계산 (해당 주 금요일 18:00 KST) - 레거시 유지
export function getDefaultDeadline(serviceDate: string): Date {
  const date = new Date(serviceDate);
  const day = date.getDay(); // 0 = 일요일

  // 해당 주 금요일 계산 (일요일 기준 -2일)
  const friday = new Date(date);
  friday.setDate(date.getDate() - (day === 0 ? 2 : day - 5));

  // 18:00 KST 설정
  friday.setHours(18, 0, 0, 0);

  return friday;
}

// 등단 투표 마감 시간 계산 (토요일 15:00 KST)
export function getServiceDeadline(serviceDate: string): Date {
  const date = new Date(serviceDate);

  // 토요일 계산 (주일 -1일)
  const saturday = new Date(date);
  saturday.setDate(date.getDate() - 1);

  // 15:00 KST 설정
  saturday.setHours(15, 0, 0, 0);

  return saturday;
}

// 연습 참석 투표 마감 시간 계산 (주일 09:00 KST)
export function getPracticeDeadline(serviceDate: string): Date {
  const date = new Date(serviceDate);

  // 주일 당일 09:00
  date.setHours(9, 0, 0, 0);

  return date;
}

// 마감 여부 확인
export function isDeadlinePassed(deadline: Date): boolean {
  return new Date() > deadline;
}

// 마감까지 남은 시간 계산
export function getTimeUntilDeadline(deadlineAt: string): {
  days: number;
  hours: number;
  minutes: number;
  isPassed: boolean;
} {
  const deadline = new Date(deadlineAt);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isPassed: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isPassed: false };
}
