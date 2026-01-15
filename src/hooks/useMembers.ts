import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/types/database.types';
import type { PaginatedResponse, SortByField, SortOrder } from '@/types/api';

// React Query stale time 설정
// 멤버 데이터는 상대적으로 자주 변경되지 않으므로 5분 유지
const STALE_TIME = {
  MEMBERS_LIST: 1000 * 60 * 5, // 5분 - 목록 데이터
  MEMBER_DETAIL: 1000 * 60 * 2, // 2분 - 상세 데이터 (수정 가능성이 더 높음)
} as const;

type Member = Database['public']['Tables']['members']['Row'];
type MemberInsert = Database['public']['Tables']['members']['Insert'];
type MemberUpdate = Database['public']['Tables']['members']['Update'];

// Member 필터링 및 페이지네이션 옵션
export interface MemberFilters {
  part?: Database['public']['Enums']['part'];
  search?: string;
  member_status?: Database['public']['Enums']['member_status'];
  page?: number;
  limit?: number;
  sortBy?: SortByField;
  sortOrder?: SortOrder;
  // 장기 미출석 필터 (일수 기준)
  absentDaysService?: number;   // 등단 미출석 일수 (예: 30, 60, 90)
  absentDaysPractice?: number;  // 연습 미출석 일수
}

// API 응답 타입
type MembersResponse = PaginatedResponse<Member>;

interface MemberResponse {
  data: Member;
  message?: string;
}

/**
 * 찬양대원 목록 조회 (페이지네이션, 필터링 지원)
 */
export function useMembers(filters?: MemberFilters) {
  return useQuery({
    queryKey: ['members', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      // null과 undefined 값은 쿼리 파라미터에 추가하지 않음
      if (filters?.part) params.append('part', filters.part);
      if (filters?.search && filters.search.trim()) params.append('search', filters.search);
      if (filters?.member_status) params.append('member_status', filters.member_status);
      if (filters?.page && filters.page > 0) params.append('page', filters.page.toString());
      if (filters?.limit && filters.limit > 0) params.append('limit', filters.limit.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      // 장기 미출석 필터
      if (filters?.absentDaysService && filters.absentDaysService > 0) {
        params.append('absentDaysService', filters.absentDaysService.toString());
      }
      if (filters?.absentDaysPractice && filters.absentDaysPractice > 0) {
        params.append('absentDaysPractice', filters.absentDaysPractice.toString());
      }

      const response = await fetch(`/api/members?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '찬양대원 목록을 불러오는데 실패했습니다');
      }

      return response.json() as Promise<MembersResponse>;
    },
    staleTime: STALE_TIME.MEMBERS_LIST,
  });
}

/**
 * 찬양대원 단일 조회
 */
export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: async () => {
      if (!id) throw new Error('ID가 필요합니다');

      const response = await fetch(`/api/members/${id}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '찬양대원 정보를 불러오는데 실패했습니다');
      }

      return response.json() as Promise<MemberResponse>;
    },
    enabled: !!id, // id가 있을 때만 쿼리 실행
    staleTime: STALE_TIME.MEMBER_DETAIL,
  });
}

/**
 * 찬양대원 신규 등록
 */
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MemberInsert) => {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '찬양대원 등록에 실패했습니다');
      }

      return response.json() as Promise<MemberResponse>;
    },
    onSuccess: () => {
      // 목록 쿼리 무효화 (새로고침)
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

/**
 * 찬양대원 정보 수정
 */
export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MemberUpdate }) => {
      const response = await fetch(`/api/members/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // 버전 충돌 에러 객체 생성 (code 포함)
        if (response.status === 409 && errorData.code === 'VERSION_CONFLICT') {
          const error = new Error(errorData.error || '버전 충돌이 발생했습니다') as Error & { code: string; status: number };
          error.code = 'VERSION_CONFLICT';
          error.status = 409;
          throw error;
        }

        throw new Error(errorData.error || '찬양대원 수정에 실패했습니다');
      }

      return response.json() as Promise<MemberResponse>;
    },
    onSuccess: (_, variables) => {
      // 목록 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['members'] });
      // 해당 멤버 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['members', variables.id] });
    },
  });
}

/**
 * 찬양대원 삭제
 */
export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/members/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '찬양대원 삭제에 실패했습니다');
      }

      return response.json() as Promise<{ message: string }>;
    },
    onSuccess: () => {
      // 목록 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
