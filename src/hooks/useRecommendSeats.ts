/**
 * AI 자리배치 추천 훅
 * Python ML 서비스와 연동하여 자동 추천 수행
 */
import { useMutation } from '@tanstack/react-query';

import { GRID_CONSTRAINTS, GridLayout } from '@/types/grid';

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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gridLayout: gridLayout
            ? {
                rows: gridLayout.rows,
                // 서버 zod max=20과 계약 일치를 위해 clamp.
                // 분배 함수가 21+를 만든 케이스(중고등부 합동 등)도 여기서 한 번 더 안전 차단.
                rowCapacities: gridLayout.rowCapacities.map((c) =>
                  Math.min(
                    Math.max(c, GRID_CONSTRAINTS.MIN_CAPACITY_PER_ROW),
                    GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW
                  )
                ),
                zigzagPattern: gridLayout.zigzagPattern,
              }
            : undefined,
          preserveGridLayout,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.detail || `Failed to get recommendation: ${response.status}`
        );
      }

      return response.json();
    },
  });
}
