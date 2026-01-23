/**
 * AI 추천 결과 프리뷰 모달
 */
'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import { RecommendationResponse } from '@/hooks/useRecommendSeats';
import { GridLayout } from '@/types/grid';

interface RecommendPreviewModalProps {
  recommendation: RecommendationResponse;
  gridLayout: GridLayout;
  /** 그리드 보존 여부와 함께 적용 */
  onApply: (preserveGridLayout: boolean) => void;
  onCancel: () => void;
}

export default function RecommendPreviewModal({
  recommendation,
  gridLayout,
  onApply,
  onCancel
}: RecommendPreviewModalProps) {
  const {
    seats,
    gridLayout: recommendedGridLayout,
    suggestedGridLayout,
    gridPreserved,
    qualityScore = 0.8,
    metrics = {
      placementRate: 1.0,
      partBalance: 0.8,
      heightOrder: 0.75
    },
    unassignedMembers = []
  } = recommendation || {};

  // 그리드 설정 유지 체크박스 상태 (기본값: true - 수동 설정 보존)
  const [preserveGridLayout, setPreserveGridLayout] = useState(true);

  // gridLayout은 추천 결과의 gridLayout을 우선 사용, 없으면 prop으로 받은 gridLayout 사용
  const effectiveGridLayout = recommendedGridLayout || gridLayout;

  // AI 추천 그리드와 현재 그리드 비교
  const hasGridDifference = suggestedGridLayout &&
    JSON.stringify(suggestedGridLayout.rowCapacities) !== JSON.stringify(gridLayout.rowCapacities);

  // 품질 점수에 따른 색상 및 메시지
  const getQualityInfo = (score: number) => {
    if (score >= 0.8) {
      return {
        color: 'text-[var(--color-success-600)]',
        bg: 'bg-[var(--color-success-50)]',
        border: 'border-[var(--color-success-200)]',
        icon: CheckCircle2,
        label: '우수',
        message: '매우 좋은 자리배치입니다!'
      };
    } else if (score >= 0.6) {
      return {
        color: 'text-[var(--color-warning-600)]',
        bg: 'bg-[var(--color-warning-50)]',
        border: 'border-[var(--color-warning-200)]',
        icon: AlertCircle,
        label: '보통',
        message: '적절한 자리배치입니다.'
      };
    } else {
      return {
        color: 'text-[var(--color-error-600)]',
        bg: 'bg-[var(--color-error-50)]',
        border: 'border-[var(--color-error-200)]',
        icon: XCircle,
        label: '개선 필요',
        message: '더 나은 배치를 위해 조정이 필요할 수 있습니다.'
      };
    }
  };

  const qualityInfo = getQualityInfo(qualityScore);
  const QualityIcon = qualityInfo.icon;

  const formatPercentage = (value: number) => `${(value * 100).toFixed(0)}%`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="p-6 border-b border-[var(--color-border)]">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
            AI 자리배치 추천
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            학습된 패턴을 기반으로 최적의 자리배치를 추천했습니다
          </p>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-6">
          {/* 전체 품질 점수 */}
          <div className={`p-4 rounded-lg border ${qualityInfo.bg} ${qualityInfo.border}`}>
            <div className="flex items-center gap-3">
              <QualityIcon className={`w-8 h-8 ${qualityInfo.color}`} />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                    {formatPercentage(qualityScore)}
                  </span>
                  <span className={`text-sm font-medium ${qualityInfo.color}`}>
                    {qualityInfo.label}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {qualityInfo.message}
                </p>
              </div>
            </div>
          </div>

          {/* 세부 메트릭 */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
              세부 평가
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                label="배치율"
                value={metrics.placementRate}
                description="전체 대원 중 배치된 비율"
              />
              <MetricCard
                label="파트 균형"
                value={metrics.partBalance}
                description="파트별 균등 분포도"
              />
              <MetricCard
                label="키 순서"
                value={metrics.heightOrder}
                description="키 순서 패턴 준수도"
              />
            </div>
          </div>

          {/* 배치 통계 */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
              배치 통계
            </h3>
            <div className="bg-[var(--color-background-secondary)] rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">배치된 대원</span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {seats.length}명
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">총 좌석</span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {effectiveGridLayout?.rowCapacities.slice(0, effectiveGridLayout?.rows).reduce((a, b) => a + b, 0) || 0}개
                </span>
              </div>
              {unassignedMembers.length > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t border-[var(--color-border)]">
                  <span className="text-[var(--color-warning-600)]">배치되지 않은 대원</span>
                  <span className="font-medium text-[var(--color-warning-600)]">
                    {unassignedMembers.length}명
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 그리드 설정 유지 옵션 */}
          {hasGridDifference && (
            <div className="bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={preserveGridLayout}
                    onChange={(e) => setPreserveGridLayout(e.target.checked)}
                    className="w-5 h-5 rounded border-[var(--color-border)] text-[var(--color-primary-500)] focus:ring-[var(--color-primary-500)]"
                  />
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    현재 그리드 설정 유지
                  </span>
                </label>
                <Info className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0 mt-0.5" />
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2 ml-7">
                {preserveGridLayout
                  ? `수동 설정한 그리드(${gridLayout.rowCapacities.join(', ')})를 유지합니다.`
                  : `AI 추천 그리드(${suggestedGridLayout?.rowCapacities.join(', ')})로 변경됩니다.`
                }
              </p>
              {!preserveGridLayout && (
                <div className="mt-2 ml-7 text-xs text-[var(--color-warning-600)] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  체크 해제 시 수동으로 설정한 행별 좌석 수가 변경됩니다.
                </div>
              )}
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="bg-[var(--color-primary-50)] border border-[var(--color-primary-200)] rounded-lg p-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-primary-600)]">💡 Tip:</strong>{' '}
              추천 결과를 적용한 후에도 클릭-클릭 방식으로 수동 조정이 가능합니다.
              필요에 따라 자리를 변경하거나 교환할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t border-[var(--color-border)] flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg font-medium hover:bg-[var(--color-background-secondary)] transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => onApply(preserveGridLayout)}
            className="px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-600)] transition-colors"
          >
            적용하기
          </button>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  description: string;
}

function MetricCard({ label, value, description }: MetricCardProps) {
  const percentage = (value * 100).toFixed(0);

  return (
    <div className="bg-[var(--color-background-secondary)] rounded-lg p-4">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold text-[var(--color-text-primary)]">
          {percentage}%
        </span>
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          {label}
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
        {description}
      </p>
      {/* 프로그레스 바 */}
      <div className="mt-2 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-primary-500)] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
