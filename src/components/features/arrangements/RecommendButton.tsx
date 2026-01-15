/**
 * AI 자리배치 추천 버튼
 */
'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useRecommendSeats, type RecommendationResponse } from '@/hooks/useRecommendSeats';
import { GridLayout } from '@/types/grid';
import RecommendPreviewModal from './RecommendPreviewModal';

interface RecommendButtonProps {
  arrangementId: string;
  gridLayout: GridLayout;
  onApply: (recommendation: RecommendationResponse) => void;
  disabled?: boolean;
}

export default function RecommendButton({
  arrangementId,
  gridLayout,
  onApply,
  disabled
}: RecommendButtonProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);

  const recommendMutation = useRecommendSeats();

  const handleRecommend = async () => {
    try {
      // 사용자가 설정한 gridLayout을 API에 전달
      const result = await recommendMutation.mutateAsync({
        arrangementId,
        gridLayout,  // 사용자 설정 그리드 전달
      });

      setRecommendation(result);
      setShowPreview(true);
    } catch (error) {
      console.error('Recommendation failed:', error);
      alert('AI 추천 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleApply = () => {
    if (recommendation) {
      onApply(recommendation);
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
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] text-white rounded-lg font-medium hover:from-[var(--color-primary-600)] hover:to-[var(--color-primary-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {recommendMutation.isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>AI 분석 중...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
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
