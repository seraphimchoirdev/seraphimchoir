
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/types/database.types';
import type { PaginatedResponse } from '@/types/api';

type Arrangement = Database['public']['Tables']['arrangements']['Row'];
type ArrangementInsert = Database['public']['Tables']['arrangements']['Insert'];
type ArrangementUpdate = Database['public']['Tables']['arrangements']['Update'];

// service_schedules에서 JOIN된 필드를 포함한 확장 타입
export interface ArrangementWithSchedule extends Arrangement {
    service_type?: string | null;  // service_schedules에서 조회
    hymn_name?: string | null;     // service_schedules에서 조회
    offertory_performer?: string | null;  // service_schedules에서 조회
    // service_info는 Arrangement에서 상속됨
}

export interface ArrangementFilters {
    page?: number;
    limit?: number;
    startDate?: string;    // YYYY-MM-DD 형식
    endDate?: string;      // YYYY-MM-DD 형식
    serviceType?: string;  // 예배 유형
    search?: string;       // 검색어
}

type ArrangementsResponse = PaginatedResponse<ArrangementWithSchedule>;

type SeatWithMember = Database['public']['Tables']['seats']['Row'] & {
    member?: { id: string; name: string } | null;
};

interface ArrangementWithSeats extends Arrangement {
    seats?: SeatWithMember[];
}

/**
 * 배치표 목록 조회
 */
export function useArrangements(filters?: ArrangementFilters) {
    return useQuery({
        queryKey: ['arrangements', filters],
        queryFn: async () => {
            const params = new URLSearchParams();

            // 페이지네이션
            if (filters?.page) params.append('page', filters.page.toString());
            if (filters?.limit) params.append('limit', filters.limit.toString());

            // 날짜 범위 필터
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);

            // 예배 유형 필터
            if (filters?.serviceType) params.append('serviceType', filters.serviceType);

            // 검색어
            if (filters?.search && filters.search.trim()) {
                params.append('search', filters.search.trim());
            }

            const response = await fetch(`/api/arrangements?${params.toString()}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '배치표 목록을 불러오는데 실패했습니다');
            }

            return response.json() as Promise<ArrangementsResponse>;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

/**
 * 배치표 단일 조회
 */
export function useArrangement(id: string | undefined) {
    return useQuery({
        queryKey: ['arrangements', id],
        queryFn: async () => {
            if (!id) throw new Error('ID가 필요합니다');

            const response = await fetch(`/api/arrangements/${id}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '배치표 정보를 불러오는데 실패했습니다');
            }

            return response.json() as Promise<ArrangementWithSeats>;
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * 배치표 생성
 */
export function useCreateArrangement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: ArrangementInsert) => {
            const response = await fetch('/api/arrangements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '배치표 생성에 실패했습니다');
            }

            return response.json() as Promise<Arrangement>;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['arrangements'] });
        },
    });
}

/**
 * 배치표 수정
 */
export function useUpdateArrangement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: ArrangementUpdate }) => {
            const response = await fetch(`/api/arrangements/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '배치표 수정에 실패했습니다');
            }

            return response.json() as Promise<Arrangement>;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['arrangements'] });
            queryClient.invalidateQueries({ queryKey: ['arrangements', variables.id] });
        },
    });
}

/**
 * 배치표 삭제
 */
export function useDeleteArrangement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/arrangements/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '배치표 삭제에 실패했습니다');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['arrangements'] });
        },
    });
}
