'use client';

import { ReactNode } from 'react';
import { useArrangementStore, WORKFLOW_STEPS, WorkflowStep } from '@/store/arrangement-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WorkflowProgress from './WorkflowProgress';
import WorkflowSection from './WorkflowSection';
import WorkflowModeToggle from './WorkflowModeToggle';
import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { useSkipStep } from '@/hooks/useWorkflowAutoAdvance';

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
  className,
}: WorkflowPanelProps) {
  const { workflow, prevStep, nextStep } = useArrangementStore();
  const { skip } = useSkipStep();
  const { currentStep, isWizardMode } = workflow;

  const steps = Object.values(WORKFLOW_STEPS);

  // 선택적 단계 (건너뛰기 가능)
  const optionalSteps: WorkflowStep[] = [5]; // Offset 조정

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
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)]">
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
        <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
          {steps.map((stepMeta) => (
            <WorkflowSection key={stepMeta.step} step={stepMeta.step}>
              {renderStepContent(stepMeta.step)}
            </WorkflowSection>
          ))}
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
