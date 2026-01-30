/**
 * AI 자리배치 추천 버튼
 */
'use client';

import { Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { type RecommendationResponse, useRecommendSeats } from '@/hooks/useRecommendSeats';

import { createLogger } from '@/lib/logger';
import { showError } from '@/lib/toast';

import { GridLayout } from '@/types/grid';

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
  const recommendMutation = useRecommendSeats();

  const handleRecommend = async () => {
    try {
      const result = await recommendMutation.mutateAsync({
        arrangementId,
        gridLayout,
      });

      onApply(result, true);
    } catch (error) {
      logger.error('Recommendation failed:', error);
      showError('AI 추천 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', handleRecommend);
    }
  };

  return (
    <Button
      onClick={handleRecommend}
      disabled={disabled || recommendMutation.isPending}
      className="bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] shadow-lg transition-all duration-200 hover:from-[var(--color-primary-600)] hover:to-[var(--color-primary-700)] hover:shadow-xl"
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
    </Button>
  );
}
