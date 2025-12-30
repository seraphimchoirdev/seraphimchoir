
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/types/database.types';

type Seat = Database['public']['Tables']['seats']['Row'];

interface BulkSeatData {
    memberId: string;
    row: number;
    column: number;
    part: Database['public']['Enums']['part'];
    isRowLeader?: boolean;
}

interface BulkUpdateSeatsPayload {
    arrangementId: string;
    seats: BulkSeatData[];
}

/**
 * 좌석 일괄 업데이트 (저장)
 */
export function useUpdateSeats() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ arrangementId, seats }: BulkUpdateSeatsPayload) => {
            const response = await fetch('/api/seats/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ arrangementId, seats }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '좌석 저장에 실패했습니다');
            }

            return response.json() as Promise<Seat[]>;
        },
        onSuccess: (_, variables) => {
            // 배치표 상세 쿼리 무효화 (좌석 정보 갱신)
            queryClient.invalidateQueries({ queryKey: ['arrangements', variables.arrangementId] });
        },
    });
}
