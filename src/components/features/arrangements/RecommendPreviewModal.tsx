/**
 * AI 추천 결과 프리뷰 모달
 */
'use client';

import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

import { useState } from 'react';

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
  onCancel,
}: RecommendPreviewModalProps) {
  const {
    seats,
    gridLayout: recommendedGridLayout,
    suggestedGridLayout,
    gridPreserved: _gridPreserved, // 추후 활용 예정
    qualityScore = 0.8,
    metrics = {
      placementRate: 1.0,
      partBalance: 0.8,
      heightOrder: 0.75,
    },
    unassignedMembers = [],
  } = recommendation || {};

  // 그리드 설정 유지 체크박스 상태 (기본값: true - 수동 설정 보존)
  const [preserveGridLayout, setPreserveGridLayout] = useState(true);

  // gridLayout은 추천 결과의 gridLayout을 우선 사용, 없으면 prop으로 받은 gridLayout 사용
  const effectiveGridLayout = recommendedGridLayout || gridLayout;

  // AI 추천 그리드와 현재 그리드 비교
  const hasGridDifference =
    suggestedGridLayout &&
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
        message: '매우 좋은 자리배치입니다!',
      };
    } else if (score >= 0.6) {
      return {
        color: 'text-[var(--color-warning-600)]',
        bg: 'bg-[var(--color-warning-50)]',
        border: 'border-[var(--color-warning-200)]',
        icon: AlertCircle,
        label: '보통',
        message: '적절한 자리배치입니다.',
      };
    } else {
      return {
        color: 'text-[var(--color-error-600)]',
        bg: 'bg-[var(--color-error-50)]',
        border: 'border-[var(--color-error-200)]',
        icon: XCircle,
        label: '개선 필요',
        message: '더 나은 배치를 위해 조정이 필요할 수 있습니다.',
      };
    }
  };

  const qualityInfo = getQualityInfo(qualityScore);
  const QualityIcon = qualityInfo.icon;

  const formatPercentage = (value: number) => `${(value * 100).toFixed(0)}%`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-[var(--color-surface)] shadow-xl">
        {/* 헤더 */}
        <div className="border-b border-[var(--color-border)] p-6">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">AI 자리배치 추천</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            학습된 패턴을 기반으로 최적의 자리배치를 추천했습니다
          </p>
        </div>

        {/* 본문 */}
        <div className="space-y-6 p-6">
          {/* 전체 품질 점수 */}
          <div className={`rounded-lg border p-4 ${qualityInfo.bg} ${qualityInfo.border}`}>
            <div className="flex items-center gap-3">
              <QualityIcon className={`h-8 w-8 ${qualityInfo.color}`} />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                    {formatPercentage(qualityScore)}
                  </span>
                  <span className={`text-sm font-medium ${qualityInfo.color}`}>
                    {qualityInfo.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {qualityInfo.message}
                </p>
              </div>
            </div>
          </div>

          {/* 세부 메트릭 */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
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
            <h3 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              배치 통계
            </h3>
            <div className="space-y-2 rounded-lg bg-[var(--color-background-secondary)] p-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">배치된 대원</span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {seats.length}명
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">총 좌석</span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {effectiveGridLayout?.rowCapacities
                    .slice(0, effectiveGridLayout?.rows)
                    .reduce((a, b) => a + b, 0) || 0}
                  개
                </span>
              </div>
              {unassignedMembers.length > 0 && (
                <div className="flex justify-between border-t border-[var(--color-border)] pt-2 text-sm">
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
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4">
              <div className="flex items-start gap-3">
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preserveGridLayout}
                    onChange={(e) => setPreserveGridLayout(e.target.checked)}
                    className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-primary-500)] focus:ring-[var(--color-primary-500)]"
                  />
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    현재 그리드 설정 유지
                  </span>
                </label>
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
              </div>
              <p className="mt-2 ml-7 text-xs text-[var(--color-text-secondary)]">
                {preserveGridLayout
                  ? `수동 설정한 그리드(${gridLayout.rowCapacities.join(', ')})를 유지합니다.`
                  : `AI 추천 그리드(${suggestedGridLayout?.rowCapacities.join(', ')})로 변경됩니다.`}
              </p>
              {!preserveGridLayout && (
                <div className="mt-2 ml-7 flex items-center gap-1 text-xs text-[var(--color-warning-600)]">
                  <AlertCircle className="h-3 w-3" />
                  체크 해제 시 수동으로 설정한 행별 좌석 수가 변경됩니다.
                </div>
              )}
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-primary-600)]">💡 Tip:</strong> 추천 결과를
              적용한 후에도 클릭-클릭 방식으로 수동 조정이 가능합니다. 필요에 따라 자리를 변경하거나
              교환할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-3 border-t border-[var(--color-border)] p-6">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-background-secondary)]"
          >
            취소
          </button>
          <button
            onClick={() => onApply(preserveGridLayout)}
            className="rounded-lg bg-[var(--color-primary-500)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--color-primary-600)]"
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
    <div className="rounded-lg bg-[var(--color-background-secondary)] p-4">
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[var(--color-text-primary)]">{percentage}%</span>
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>
      </div>
      <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{description}</p>
      {/* 프로그레스 바 */}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className="h-full bg-[var(--color-primary-500)] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
