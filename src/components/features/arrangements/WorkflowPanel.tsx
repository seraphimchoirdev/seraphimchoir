'use client';

import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';

import { ReactNode, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useSkipStep } from '@/hooks/useWorkflowAutoAdvance';

import { WORKFLOW_STEPS, WorkflowStep, useArrangementStore } from '@/store/arrangement-store';

import WorkflowModeToggle from './WorkflowModeToggle';
import WorkflowProgress from './WorkflowProgress';
import WorkflowSection from './WorkflowSection';

/**
 * 각 단계별 완료 조건 및 안내 메시지
 */
interface StepCompletionConfig {
  canComplete: boolean;
  message?: string;
}

interface WorkflowPanelProps {
  /** 각 단계의 컨텐츠를 렌더링하는 함수 */
  renderStepContent: (step: WorkflowStep) => ReactNode;
  /** 총 멤버 수 (진행 상태 계산용) */
  totalMembers: number;
  /** 현재 배치표 상태 */
  arrangementStatus?: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 워크플로우 전체 패널 컴포넌트
 *
 * 7단계 워크플로우를 Collapsible 섹션으로 렌더링하며,
 * Progress Indicator와 모드 토글을 포함합니다.
 *
 * ```tsx
 * <WorkflowPanel
 *   renderStepContent={(step) => {
 *     switch (step) {
 *       case 1: return <AIRecommendSection />;
 *       case 2: return <GridSettingsPanel />;
 *       // ...
 *     }
 *   }}
 * />
 * ```
 */
export default function WorkflowPanel({
  renderStepContent,
  totalMembers,
  className,
}: WorkflowPanelProps) {
  const { workflow, prevStep, nextStep, assignments, gridLayout } = useArrangementStore();
  const { skip } = useSkipStep();
  const { currentStep, isWizardMode } = workflow;

  const steps = Object.values(WORKFLOW_STEPS);

  // 선택적 단계 (건너뛰기 가능)
  const optionalSteps: WorkflowStep[] = [5]; // Offset 조정

  // 배치 상태 계산
  const assignmentsCount = Object.keys(assignments).length;
  const unassignedCount = totalMembers - assignmentsCount;

  /**
   * 단계별 완료 조건 계산
   */
  const stepCompletionConfigs = useMemo((): Record<WorkflowStep, StepCompletionConfig> => {
    return {
      1: {
        // 1단계: AI 추천 분배 실행 필요 (또는 수동 설정)
        canComplete:
          gridLayout?.isAIRecommended === true || gridLayout?.isManuallyConfigured === true,
        message: 'AI 추천 분배를 실행하거나 수동으로 그리드를 설정해야 합니다.',
      },
      2: {
        // 2단계: 수동 조정은 선택적이므로 항상 완료 가능
        canComplete: true,
      },
      3: {
        // 3단계: 배치된 멤버가 있어야 완료 가능 (핵심 변경)
        canComplete: assignmentsCount > 0,
        message: 'AI 자동배치 또는 과거 배치를 적용해야 합니다.',
      },
      4: {
        // 4단계: 모든 멤버가 배치되어야 완료 가능
        canComplete: totalMembers > 0 && unassignedCount === 0,
        message: `미배치 멤버가 ${unassignedCount}명 있습니다. 모든 멤버를 배치해주세요.`,
      },
      5: {
        // 5단계: 선택적 단계 - 항상 완료 가능
        canComplete: true,
      },
      6: {
        // 6단계: 선택적 단계 - 항상 완료 가능
        canComplete: true,
      },
      7: {
        // 7단계: 저장/공유 - 항상 완료 가능
        canComplete: true,
      },
    };
  }, [
    gridLayout?.isAIRecommended,
    gridLayout?.isManuallyConfigured,
    assignmentsCount,
    totalMembers,
    unassignedCount,
  ]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">자리배치 워크플로우</CardTitle>
          <WorkflowModeToggle />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Indicator */}
        <WorkflowProgress />

        {/* 워크플로우 네비게이션 (위자드 모드) */}
        {isWizardMode && (
          <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              disabled={currentStep <= 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>

            <div className="flex items-center gap-2">
              {/* 선택적 단계에서 건너뛰기 버튼 */}
              {optionalSteps.includes(currentStep) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => skip(currentStep)}
                  className="gap-1 text-[var(--color-text-secondary)]"
                >
                  <SkipForward className="h-4 w-4" />
                  건너뛰기
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={nextStep}
                disabled={currentStep >= 7}
                className="gap-1"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 워크플로우 섹션들 */}
        <div className="max-h-[calc(100vh-400px)] space-y-3 overflow-y-auto">
          {steps.map((stepMeta) => {
            const config = stepCompletionConfigs[stepMeta.step];
            return (
              <WorkflowSection
                key={stepMeta.step}
                step={stepMeta.step}
                canComplete={config.canComplete}
                cannotCompleteMessage={config.message}
                hideCompleteButton={stepMeta.step === 1}
              >
                {renderStepContent(stepMeta.step)}
              </WorkflowSection>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 개별 워크플로우 단계 컨텐츠를 위한 래퍼
 * (간단한 컨텐츠용)
 */
interface StepContentProps {
  step: WorkflowStep;
  children: ReactNode;
}

export function StepContent({ children }: StepContentProps) {
  return <div className="min-h-[100px]">{children}</div>;
}
