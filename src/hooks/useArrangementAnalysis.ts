'use client';

import { useMutation } from '@tanstack/react-query';
import type { ArrangementAnalysisResponse } from '@/types/analysis';

interface AnalyzeParams {
  arrangementId: string;
}

interface AnalyzeError {
  error: string;
}

/**
 * 배치 분석 훅
 * 현재 배치의 품질을 분석합니다.
 */
export function useArrangementAnalysis() {
  return useMutation<ArrangementAnalysisResponse, Error, AnalyzeParams>({
    mutationFn: async ({ arrangementId }) => {
      const response = await fetch(`/api/arrangements/${arrangementId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData: AnalyzeError = await response.json();
        throw new Error(errorData.error || '분석에 실패했습니다.');
      }

      return response.json();
    },
  });
}
