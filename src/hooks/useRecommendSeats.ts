/**
 * AI 자리배치 추천 훅
 * Python ML 서비스와 연동하여 자동 추천 수행
 */
import { useMutation } from '@tanstack/react-query';
import { GridLayout } from '@/types/grid';

interface RecommendSeatsParams {
  arrangementId: string;
  gridLayout?: GridLayout;
  /** 기존 그리드 설정 유지 여부 (기본값: true) */
  preserveGridLayout?: boolean;
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
  /** AI가 제안하는 그리드 (사용자가 선택적으로 적용 가능) */
  suggestedGridLayout?: {
    rows: number;
    rowCapacities: number[];
    zigzagPattern: 'none' | 'even' | 'odd';
  };
  /** 기존 그리드가 보존되었는지 여부 */
  gridPreserved?: boolean;
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
    mutationFn: async ({ arrangementId, gridLayout, preserveGridLayout = true }) => {
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
          } : undefined,
          preserveGridLayout,
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
