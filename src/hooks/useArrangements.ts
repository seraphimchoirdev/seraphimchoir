
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/types/database.types';
import type { PaginatedResponse } from '@/types/api';

type Arrangement = Database['public']['Tables']['arrangements']['Row'];
type ArrangementInsert = Database['public']['Tables']['arrangements']['Insert'];
type ArrangementUpdate = Database['public']['Tables']['arrangements']['Update'];

export interface ArrangementFilters {
    page?: number;
    limit?: number;
}

type ArrangementsResponse = PaginatedResponse<Arrangement>;

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
            if (filters?.page) params.append('page', filters.page.toString());
            if (filters?.limit) params.append('limit', filters.limit.toString());

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
