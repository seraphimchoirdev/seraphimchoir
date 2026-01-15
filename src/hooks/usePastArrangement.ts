/**
 * 과거 자리배치 불러오기 관련 훅
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/constants';
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
    reason: 'not_in_past' | 'out_of_grid' | 'seat_conflict' | 'zone_full';
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

// 파트별 구성 정보
export interface PartComposition {
    SOPRANO: number;
    ALTO: number;
    TENOR: number;
    BASS: number;
    SPECIAL: number;
}

// 확장된 배치표 정보 (좌석 수, 파트 구성, 봉헌송 정보 포함)
export interface EnrichedArrangement extends Arrangement {
    service_type: string | null;
    hymn_name: string | null;
    offertory_performer: string | null;
    seat_count: number;
    part_composition: PartComposition;
    // 유사도 점수 (프론트엔드에서 계산)
    similarity_score?: number;
}

interface PastArrangementsResponse {
    data: EnrichedArrangement[];
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
    // 유사도 매칭을 위한 현재 인원 구성
    currentComposition?: PartComposition;
}

/**
 * 파트별 구성 유사도 계산 (코사인 유사도 기반)
 * 총 인원수와 파트별 비율을 모두 고려
 */
function calculateSimilarity(
    current: PartComposition,
    past: PartComposition
): number {
    const currentTotal = current.SOPRANO + current.ALTO + current.TENOR + current.BASS + current.SPECIAL;
    const pastTotal = past.SOPRANO + past.ALTO + past.TENOR + past.BASS + past.SPECIAL;

    // 둘 다 0이면 유사도 0
    if (currentTotal === 0 || pastTotal === 0) return 0;

    // 1. 총 인원수 유사도 (차이가 적을수록 높은 점수)
    const totalDiff = Math.abs(currentTotal - pastTotal);
    const totalSimilarity = Math.max(0, 1 - totalDiff / Math.max(currentTotal, pastTotal));

    // 2. 파트별 비율 유사도 (코사인 유사도)
    const currentVec = [
        current.SOPRANO / currentTotal,
        current.ALTO / currentTotal,
        current.TENOR / currentTotal,
        current.BASS / currentTotal,
        current.SPECIAL / currentTotal,
    ];
    const pastVec = [
        past.SOPRANO / pastTotal,
        past.ALTO / pastTotal,
        past.TENOR / pastTotal,
        past.BASS / pastTotal,
        past.SPECIAL / pastTotal,
    ];

    // 코사인 유사도 계산
    let dotProduct = 0;
    let normCurrent = 0;
    let normPast = 0;
    for (let i = 0; i < 5; i++) {
        dotProduct += currentVec[i] * pastVec[i];
        normCurrent += currentVec[i] * currentVec[i];
        normPast += pastVec[i] * pastVec[i];
    }
    const ratioSimilarity = dotProduct / (Math.sqrt(normCurrent) * Math.sqrt(normPast) || 1);

    // 3. 가중 평균 (총 인원 40%, 파트 비율 60%)
    const score = (totalSimilarity * 0.4 + ratioSimilarity * 0.6) * 100;

    return Math.round(score);
}

/**
 * 과거 배치표 목록 조회 hook (현재 배치표 제외)
 * currentComposition이 주어지면 유사도 순으로 정렬
 */
export function usePastArrangements(params: PastArrangementsParams = {}) {
    const { excludeId, page = 1, limit = 10, currentComposition } = params;

    return useQuery<PastArrangementsResponse, Error>({
        queryKey: ['pastArrangements', excludeId, page, limit, currentComposition],
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

            // 유사도 계산 및 정렬 (currentComposition이 주어진 경우)
            if (currentComposition) {
                result.data = result.data.map(arr => ({
                    ...arr,
                    similarity_score: calculateSimilarity(currentComposition, arr.part_composition),
                }));

                // 유사도 높은 순으로 정렬
                result.data.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
            }

            return result;
        },
        staleTime: STALE_TIME.LONG, // 5분
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
        case 'zone_full':
            return '파트 영역 부족';
        default:
            return '알 수 없음';
    }
}
