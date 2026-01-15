/**
 * AI 자리배치 추천 훅
 * Python ML 서비스와 연동하여 자동 추천 수행
 */
import { useMutation } from '@tanstack/react-query';
import { GridLayout } from '@/types/grid';

interface RecommendSeatsParams {
  arrangementId: string;
  gridLayout?: GridLayout;
}

export interface SeatRecommendation {
  memberId: string;
  memberName: string;
  row: number;
  col: number;
  part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';
}

export interface RecommendationMetrics {
  placementRate: number;
  partBalance: number;
  heightOrder: number;
}

export interface RecommendationResponse {
  seats: SeatRecommendation[];
  gridLayout?: {
    rows: number;
    rowCapacities: number[];
    zigzagPattern: 'none' | 'even' | 'odd';
  };
  metadata?: {
    totalMembers: number;
    breakdown: Record<string, number>;
  };
  qualityScore?: number;
  metrics?: RecommendationMetrics;
  unassignedMembers?: string[];
}

/**
 * AI 자리배치 추천 훅
 */
export function useRecommendSeats() {
  return useMutation<RecommendationResponse, Error, RecommendSeatsParams>({
    mutationFn: async ({ arrangementId, gridLayout }) => {
      const response = await fetch(`/api/arrangements/${arrangementId}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gridLayout: gridLayout ? {
            rows: gridLayout.rows,
            rowCapacities: gridLayout.rowCapacities,
            zigzagPattern: gridLayout.zigzagPattern
          } : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.detail || `Failed to get recommendation: ${response.status}`
        );
      }

      return response.json();
    }
  });
}
