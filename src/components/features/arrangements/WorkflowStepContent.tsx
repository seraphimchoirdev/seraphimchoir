'use client';

import {
  CheckCircle2,
  Copy,
  Crown,
  Download,
  GripHorizontal,
  Loader2,
  Lock,
  MousePointer2,
  Share2,
  SkipForward,
  Sparkles,
  Trash2,
} from 'lucide-react';

import GridSettingsPanel from '@/components/features/arrangements/GridSettingsPanel';
import OffsetPresetButtons from '@/components/features/arrangements/OffsetPresetButtons';
import RecommendButton from '@/components/features/arrangements/RecommendButton';
import { Button } from '@/components/ui/button';

import type { RecommendationResponse } from '@/hooks/useRecommendSeats';

import { showInfo, showSuccess } from '@/lib/toast';

import { WorkflowStep, useArrangementStore } from '@/store/arrangement-store';

/** useImageExportHandlers 반환값 중 스텝 콘텐츠가 사용하는 부분 */
export interface ImageExportControls {
  handleDownloadImage: () => Promise<void>;
  handleCopyToClipboard: () => Promise<void>;
  handleShareImage: () => Promise<void>;
  isGenerating: boolean;
  canShare: boolean;
  isMobile: boolean;
}

interface WorkflowStepContentProps {
  step: WorkflowStep;
  arrangementId: string;
  arrangementStatus: string | null;
  totalMembers: number;
  isReadOnly: boolean;
  onApplyRecommendation: (recommendation: RecommendationResponse, preserveGrid: boolean) => void;
  /** 줄반장 전체 해제 확인 다이얼로그 열기 */
  onRequestClearRowLeaders: () => void;
  imageExport: ImageExportControls;
}

/**
 * 워크플로우 패널(Expanded)의 단계별 콘텐츠 (B10)
 *
 * arrangements/[id]/page.tsx의 renderWorkflowStepContent에서 추출.
 * 스토어 상태(gridLayout·assignments·줄반장 모드)는 직접 구독하고,
 * 페이지 수준 컨텍스트(권한·인원수·이미지 내보내기)만 props로 받는다.
 */
export default function WorkflowStepContent({
  step,
  arrangementId,
  arrangementStatus,
  totalMembers,
  isReadOnly,
  onApplyRecommendation,
  onRequestClearRowLeaders,
  imageExport,
}: WorkflowStepContentProps) {
  const gridLayout = useArrangementStore((state) => state.gridLayout);
  const setGridLayout = useArrangementStore((state) => state.setGridLayout);
  const assignments = useArrangementStore((state) => state.assignments);
  const rowLeaderMode = useArrangementStore((state) => state.rowLeaderMode);
  const toggleRowLeaderMode = useArrangementStore((state) => state.toggleRowLeaderMode);
  const autoAssignRowLeaders = useArrangementStore((state) => state.autoAssignRowLeaders);

  const {
    handleDownloadImage,
    handleCopyToClipboard,
    handleShareImage,
    isGenerating,
    canShare,
  } = imageExport;

  switch (step) {
    case 1:
      // 줄 구성 설정 (1단계에서는 줄 수/줄별 인원만 표시)
      // embedded: WorkflowPanel 내부에서 Card wrapper 없이 렌더링 (중첩 Card 방지)
      return (
        <>
          {gridLayout?.isAIRecommended && (
            <div className="flex items-start gap-2 rounded-lg bg-[var(--color-primary-50)] p-3">
              <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-primary-500)]" />
              <p className="text-sm text-[var(--color-primary-700)]">
                출석 인원 <strong>{totalMembers}명</strong> 기반으로 줄 구성이 자동 설정되었습니다.
                필요 시 아래에서 수동으로 조정하세요.
              </p>
            </div>
          )}
          <GridSettingsPanel
            gridLayout={gridLayout}
            onChange={setGridLayout}
            totalMembers={totalMembers}
            workflowStep={1}
            embedded
          />
        </>
      );
    case 2:
      // 줄 정렬 조정 - 프리셋 + 인라인 화살표 컨트롤
      return (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            프리셋을 선택하거나, 화살표 버튼으로 각 행을 개별 조정하세요.
          </p>
          <OffsetPresetButtons disabled={isReadOnly} />
          <p className="text-xs text-[var(--color-text-tertiary)]">
            개별 행은 그리드 왼쪽의 화살표 버튼으로 미세 조정할 수 있습니다.
          </p>
        </div>
      );
    case 3:
      // AI 자동배치 - 버튼을 Card 내부에 직접 배치
      return (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            파트, 키, 경력을 고려하여 좌석을 자동으로 배치합니다.
          </p>
          {!isReadOnly && gridLayout && (
            <RecommendButton
              arrangementId={arrangementId}
              gridLayout={gridLayout}
              onApply={onApplyRecommendation}
            />
          )}
          <div className="border-t border-dashed border-[var(--color-border-subtle)] pt-2">
            <p className="flex items-start gap-1.5 text-xs text-[var(--color-text-tertiary)]">
              <SkipForward className="mt-0.5 h-3 w-3 flex-shrink-0" />
              이 단계를 건너뛰고 직접 배치할 수도 있습니다. 건너뛰기를 원하시면
              &apos;이 단계 완료&apos; 버튼을 눌러주세요.
            </p>
          </div>
        </div>
      );
    case 4:
      // 수동 배치 조정
      return (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            대원을 선택하고 좌석을 클릭하여 배치를 조정합니다.
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
              <MousePointer2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-[var(--color-primary-400)]" />
              <span>이름 클릭 후 빈 좌석을 클릭하여 배치</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
              <MousePointer2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-[var(--color-error-400)]" />
              <span>배치된 좌석 더블클릭으로 제거</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
              <GripHorizontal className="mt-0.5 h-3 w-3 flex-shrink-0 text-[var(--color-text-tertiary)]" />
              <span>좌석 간 드래그로 자리 이동</span>
            </div>
          </div>
        </div>
      );
    case 5:
      // 줄반장 지정 - 버튼을 Card 내부에 직접 배치
      return (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">각 줄의 대표를 지정합니다.</p>
          {Object.keys(assignments).length === 0 && (
            <div className="rounded-lg bg-[var(--color-background-secondary)] p-4 text-center">
              <p className="text-sm text-[var(--color-text-tertiary)]">
                아직 배치된 대원이 없습니다.<br/>이전 단계에서 대원을 배치해주세요.
              </p>
            </div>
          )}
          {!isReadOnly && Object.keys(assignments).length > 0 && (
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant={rowLeaderMode ? 'default' : 'outline'}
                onClick={toggleRowLeaderMode}
                aria-pressed={rowLeaderMode}
                className={`w-full gap-2 ${rowLeaderMode ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
              >
                <Crown className="h-4 w-4" />
                {rowLeaderMode ? '수동 지정 모드 끄기' : '수동 지정 모드'}
              </Button>
              <Button
                size="sm"
                variant="primarySubtle"
                onClick={() => {
                  const candidates = autoAssignRowLeaders();
                  if (candidates.length > 0) {
                    showSuccess(`줄반장 ${candidates.length}명이 자동 지정되었습니다.`);
                  } else {
                    showInfo('자동 지정할 수 있는 줄반장이 없습니다.');
                  }
                }}
                className="w-full gap-2"
              >
                <Sparkles className="h-4 w-4" />
                자동 지정
              </Button>
              <div className="border-t border-[var(--color-border-subtle)] pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onRequestClearRowLeaders}
                  className="w-full gap-2 text-[var(--color-text-tertiary)]"
                >
                  <Trash2 className="h-4 w-4" />
                  전체 해제
                </Button>
              </div>
            </div>
          )}
        </div>
      );
    case 6:
      // 지시사항 작성 (에디터는 배치표 하단 인라인으로 표시)
      return (
        <div className="space-y-2">
          <p className="text-sm text-[var(--color-text-secondary)]">
            아래 배치표 하단에서 안내 메모를 작성하세요.
            대원 이동 동선, 대형 변경 등 특이사항을 기록할 수 있습니다.
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            작성된 내용은 이미지 내보내기에 포함됩니다.
          </p>
        </div>
      );
    case 7: {
      // 내보내기 및 확정
      const noAssignmentsExpanded = Object.keys(assignments).length === 0;
      const currentArrangementStatus = arrangementStatus ?? 'DRAFT';
      return (
        <div className="space-y-3">
          {/* 섹션 1: 이미지 내보내기 */}
          <div className="space-y-2 rounded-lg bg-[var(--color-background-secondary)] p-3">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              이미지 내보내기
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              완성된 배치표를 이미지로 내보내세요.
            </p>
            <div className="flex flex-col gap-2">
              {canShare && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleShareImage}
                  disabled={noAssignmentsExpanded || isGenerating}
                  aria-busy={isGenerating}
                  className="w-full gap-1"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  이미지 공유하기
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadImage}
                disabled={noAssignmentsExpanded || isGenerating}
                aria-busy={isGenerating}
                className="w-full gap-1"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                PNG 다운로드
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={noAssignmentsExpanded || isGenerating}
                aria-busy={isGenerating}
                className="w-full gap-1"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                클립보드 복사
              </Button>
            </div>
          </div>

          {/* 섹션 2: 편집 완료 / 확정 안내 */}
          <div className="space-y-2 rounded-lg bg-[var(--color-background-secondary)] p-3">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              편집 완료
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              편집이 완료되면 상단 헤더의 버튼으로 잠가주세요.{'\n'}
              편집 완료 후에도 긴급 수정은 가능합니다.
            </p>
            {currentArrangementStatus === 'DRAFT' && (
              <p className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="h-3 w-3" />
                상단의 &apos;편집 완료&apos; 버튼을 눌러주세요.
              </p>
            )}
            {currentArrangementStatus === 'SHARED' && (
              <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Lock className="h-3 w-3" />
                상단의 &apos;최종 확정&apos; 버튼으로 최종 확정할 수 있습니다.
              </p>
            )}
            {currentArrangementStatus === 'CONFIRMED' && (
              <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Lock className="h-3 w-3" />
                배치표가 확정되었습니다.
              </p>
            )}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
