/**
 * AI 자리배치 추천 버튼
 */
'use client';

import { Loader2, Sparkles } from 'lucide-react';

import { useState } from 'react';

import { type RecommendationResponse, useRecommendSeats } from '@/hooks/useRecommendSeats';

import { createLogger } from '@/lib/logger';
import { showError } from '@/lib/toast';

import { GridLayout } from '@/types/grid';

import RecommendPreviewModal from './RecommendPreviewModal';

const logger = createLogger({ prefix: 'RecommendButton' });

interface RecommendButtonProps {
  arrangementId: string;
  gridLayout: GridLayout;
  /** 추천 결과와 그리드 보존 여부를 함께 전달 */
  onApply: (recommendation: RecommendationResponse, preserveGridLayout: boolean) => void;
  disabled?: boolean;
}

export default function RecommendButton({
  arrangementId,
  gridLayout,
  onApply,
  disabled,
}: RecommendButtonProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);

  const recommendMutation = useRecommendSeats();

  const handleRecommend = async () => {
    try {
      // 사용자가 설정한 gridLayout을 API에 전달
      const result = await recommendMutation.mutateAsync({
        arrangementId,
        gridLayout, // 사용자 설정 그리드 전달
      });

      setRecommendation(result);
      setShowPreview(true);
    } catch (error) {
      logger.error('Recommendation failed:', error);
      showError('AI 추천 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', handleRecommend);
    }
  };

  const handleApply = (preserveGridLayout: boolean) => {
    if (recommendation) {
      onApply(recommendation, preserveGridLayout);
      setShowPreview(false);
      setRecommendation(null);
    }
  };

  const handleCancel = () => {
    setShowPreview(false);
    setRecommendation(null);
  };

  return (
    <>
      <button
        onClick={handleRecommend}
        disabled={disabled || recommendMutation.isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] px-4 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:from-[var(--color-primary-600)] hover:to-[var(--color-primary-700)] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
      >
        {recommendMutation.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>AI 분석 중...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            <span>AI 자동 배치</span>
          </>
        )}
      </button>

      {showPreview && recommendation && (
        <RecommendPreviewModal
          recommendation={recommendation}
          gridLayout={gridLayout}
          onApply={handleApply}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
