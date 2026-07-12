'use client';

import { Check, Copy, Crown, Download, Loader2, Settings, Share2, Sparkles } from 'lucide-react';

import OffsetPresetButtons from '@/components/features/arrangements/OffsetPresetButtons';
import RecommendButton from '@/components/features/arrangements/RecommendButton';
import { Button } from '@/components/ui/button';

import type { RecommendationResponse } from '@/hooks/useRecommendSeats';

import { showInfo, showSuccess } from '@/lib/toast';

import { WorkflowStep, useArrangementStore } from '@/store/arrangement-store';

import type { ImageExportControls } from './WorkflowStepContent';

interface WorkflowFloatingStepContentProps {
  step: WorkflowStep;
  arrangementId: string;
  totalMembers: number;
  isReadOnly: boolean;
  onApplyRecommendation: (recommendation: RecommendationResponse, preserveGrid: boolean) => void;
  /** 워크플로우 패널을 Expanded 모드로 전환 */
  onExpandPanel: () => void;
  imageExport: ImageExportControls;
}

/**
 * Compact 모드 플로팅 액션 바의 단계별 콘텐츠 (B10)
 *
 * arrangements/[id]/page.tsx의 renderFloatingStepContent에서 추출.
 * Expanded 버전(WorkflowStepContent)과 달리 위자드 모드의
 * '이 단계 완료' 버튼을 포함한다.
 */
export default function WorkflowFloatingStepContent({
  step,
  arrangementId,
  totalMembers,
  isReadOnly,
  onApplyRecommendation,
  onExpandPanel,
  imageExport,
}: WorkflowFloatingStepContentProps) {
  const gridLayout = useArrangementStore((state) => state.gridLayout);
  const assignments = useArrangementStore((state) => state.assignments);
  const rowLeaderMode = useArrangementStore((state) => state.rowLeaderMode);
  const toggleRowLeaderMode = useArrangementStore((state) => state.toggleRowLeaderMode);
  const autoAssignRowLeaders = useArrangementStore((state) => state.autoAssignRowLeaders);
  const workflow = useArrangementStore((state) => state.workflow);
  const completeStep = useArrangementStore((state) => state.completeStep);

  const {
    handleDownloadImage,
    handleCopyToClipboard,
    handleShareImage,
    isGenerating,
    canShare,
    isMobile,
  } = imageExport;

  const assignmentsCount = Object.keys(assignments).length;
  const unassignedCount = totalMembers - assignmentsCount;

  switch (step) {
    case 1:
      return (
        <div className="space-y-2">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            현재 {gridLayout?.rows ?? 0}줄 / {gridLayout?.rowCapacities?.reduce((a, b) => a + b, 0) ?? 0}석
          </p>
          <Button
            onClick={onExpandPanel}
            variant="outline"
            className="w-full gap-2"
            size="sm"
          >
            <Settings className="h-4 w-4" />
            줄 구성 설정 열기
          </Button>
          {workflow.isWizardMode && !workflow.completedSteps.has(1) && (
            <Button
              size="sm"
              onClick={() => completeStep(1)}
              className="w-full gap-1"
            >
              <Check className="h-4 w-4" />이 단계 완료
            </Button>
          )}
        </div>
      );
    case 2:
      // 줄 정렬 조정 Floating UI
      return (
        <div className="space-y-2">
          <OffsetPresetButtons disabled={isReadOnly} />
          {workflow.isWizardMode && !workflow.completedSteps.has(2) && (
            <Button
              size="sm"
              onClick={() => completeStep(2)}
              className="w-full gap-1"
            >
              <Check className="h-4 w-4" />이 단계 완료
            </Button>
          )}
        </div>
      );
    case 3:
      // AI 자동배치 Floating UI
      return !isReadOnly && gridLayout ? (
        <RecommendButton
          arrangementId={arrangementId}
          gridLayout={gridLayout}
          onApply={onApplyRecommendation}
        />
      ) : null;
    case 4:
      // 수동 배치 조정 Floating UI
      return (
        <div className="space-y-2">
          <p className="text-sm text-[var(--color-text-secondary)]">
            대원을 선택 → 좌석 클릭으로 배치를 조정하세요.
          </p>
          {unassignedCount > 0 ? (
            <p className="text-xs text-[var(--color-warning-600)]">미배치: {unassignedCount}명</p>
          ) : totalMembers > 0 ? (
            <p className="text-xs text-[var(--color-success-600)]">전원 배치 완료</p>
          ) : null}
          {workflow.isWizardMode && !workflow.completedSteps.has(4) && (
            <Button
              size="sm"
              onClick={() => completeStep(4)}
              disabled={totalMembers === 0 || unassignedCount !== 0}
              className="w-full gap-1"
            >
              <Check className="h-4 w-4" />이 단계 완료
            </Button>
          )}
        </div>
      );
    case 5:
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            {!isReadOnly && Object.keys(assignments).length > 0 && (
              <>
                <Button
                  size="sm"
                  variant={rowLeaderMode ? 'default' : 'outline'}
                  onClick={toggleRowLeaderMode}
                  className={`gap-1 ${rowLeaderMode ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                >
                  <Crown className="h-3 w-3" />
                  {rowLeaderMode ? '수동 지정 끄기' : '수동 지정'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const candidates = autoAssignRowLeaders();
                    if (candidates.length > 0) {
                      showSuccess(`줄반장 ${candidates.length}명이 자동 지정되었습니다.`);
                    } else {
                      showInfo('자동 지정할 수 있는 줄반장이 없습니다.');
                    }
                  }}
                  className="gap-1"
                >
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                  자동 지정
                </Button>
              </>
            )}
          </div>
          {workflow.isWizardMode && !workflow.completedSteps.has(5) && (
            <Button
              size="sm"
              onClick={() => completeStep(5)}
              className="w-full gap-1"
            >
              <Check className="h-4 w-4" />이 단계 완료
            </Button>
          )}
        </div>
      );
    case 6:
      return (
        <p className="text-xs text-[var(--color-text-secondary)]">
          아래 배치표 하단에서 안내 메모를 작성하세요.
        </p>
      );
    case 7: {
      const noAssignments = Object.keys(assignments).length === 0;
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            {canShare && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleShareImage}
                disabled={noAssignments || isGenerating}
                aria-busy={isGenerating}
                className="gap-1"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                이미지 공유하기
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadImage}
              disabled={noAssignments || isGenerating}
              aria-busy={isGenerating}
              className="gap-1"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isMobile ? '이미지 저장' : 'PNG 다운로드'}
            </Button>
            {!isMobile && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={noAssignments || isGenerating}
                aria-busy={isGenerating}
                className="gap-1"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                클립보드 복사
              </Button>
            )}
          </div>
          {workflow.isWizardMode && !workflow.completedSteps.has(6) && (
            <Button
              size="sm"
              onClick={() => completeStep(6)}
              className="w-full gap-1"
            >
              <Check className="h-4 w-4" />이 단계 완료
            </Button>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
