/**
 * 과거 자리배치 불러오기 관련 훅
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Database } from '@/types/database.types';

type Part = Database['public']['Enums']['part'];

interface SeatRecommendation {
    memberId: string;
    memberName: string;
    row: number;
    col: number;
    part: Part;
}

interface UnassignedMember {
    id: string;
    name: string;
    part: Part;
    reason: 'not_in_past' | 'out_of_grid' | 'seat_conflict';
}

export interface ApplyPastResponse {
    seats: SeatRecommendation[];
    matchedCount: number;
    totalAvailable: number;
    unassignedMembers: UnassignedMember[];
    gridLayout: {
        rows: number;
        rowCapacities: number[];
        zigzagPattern: 'even' | 'odd' | 'none';
    };
}

interface ApplyPastParams {
    currentArrangementId: string;
    sourceArrangementId: string;
    gridLayout?: {
        rows: number;
        rowCapacities: number[];
        zigzagPattern: 'even' | 'odd' | 'none';
    };
}

/**
 * 과거 배치 적용 mutation hook
 */
export function useApplyPastArrangement() {
    return useMutation<ApplyPastResponse, Error, ApplyPastParams>({
        mutationFn: async ({ currentArrangementId, sourceArrangementId, gridLayout }) => {
            const response = await fetch(
                `/api/arrangements/${currentArrangementId}/apply-past`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ sourceArrangementId, gridLayout })
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || `과거 배치 적용 실패: ${response.status}`
                );
            }

            return response.json();
        }
    });
}

type Arrangement = Database['public']['Tables']['arrangements']['Row'];

interface PastArrangementsResponse {
    data: Arrangement[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

interface PastArrangementsParams {
    excludeId?: string;
    page?: number;
    limit?: number;
}

/**
 * 과거 배치표 목록 조회 hook (현재 배치표 제외)
 */
export function usePastArrangements(params: PastArrangementsParams = {}) {
    const { excludeId, page = 1, limit = 10 } = params;

    return useQuery<PastArrangementsResponse, Error>({
        queryKey: ['pastArrangements', excludeId, page, limit],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            searchParams.append('page', page.toString());
            searchParams.append('limit', limit.toString());

            const response = await fetch(`/api/arrangements?${searchParams.toString()}`);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || '과거 배치표 목록을 불러오는데 실패했습니다');
            }

            const result = await response.json() as PastArrangementsResponse;

            // 현재 배치표 제외
            if (excludeId) {
                result.data = result.data.filter(arr => arr.id !== excludeId);
            }

            return result;
        },
        staleTime: 1000 * 60 * 5 // 5분
    });
}

/**
 * 미배치 이유를 한글로 변환
 */
export function getUnassignedReasonText(reason: UnassignedMember['reason']): string {
    switch (reason) {
        case 'not_in_past':
            return '과거 배치에 없음';
        case 'out_of_grid':
            return '그리드 범위 초과';
        case 'seat_conflict':
            return '좌석 충돌';
        default:
            return '알 수 없음';
    }
}
