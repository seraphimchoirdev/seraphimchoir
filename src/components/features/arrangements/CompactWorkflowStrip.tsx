'use client';

import { Check, ChevronRight, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

import { WORKFLOW_STEPS, WorkflowStep } from '@/store/arrangement-store';

interface CompactWorkflowStripProps {
  currentStep: WorkflowStep;
  completedSteps: Set<WorkflowStep>;
  canAccessStep: (step: WorkflowStep) => boolean;
  onStepClick: (step: WorkflowStep) => void;
  onExpand: () => void;
}

/**
 * Docker Desktop 스타일 컴팩트 사이드바
 *
 * 아이콘(단계 원형 번호)만 세로로 표시하는 좁은 스트립.
 * 현재 단계에 파란색 하이라이트, 완료 단계에 체크, 잠긴 단계에 자물쇠.
 */
export default function CompactWorkflowStrip({
  currentStep,
  completedSteps,
  canAccessStep,
  onStepClick,
  onExpand,
}: CompactWorkflowStripProps) {
  const steps = Object.values(WORKFLOW_STEPS);

  return (
    <div className="animate-in slide-in-from-left flex h-full w-16 flex-shrink-0 flex-col items-center border-r border-[var(--color-border-default)] bg-[var(--color-surface)] py-4 duration-300">
      {/* 펼치기 버튼 */}
      <Button
        onClick={onExpand}
        variant="outline"
        size="icon"
        className="mb-2 h-10 w-10 flex-shrink-0 rounded-full"
        title="워크플로우 패널 펼치기"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* 단계 노드들 */}
      <div className="flex flex-1 min-h-0 flex-col items-center gap-1 overflow-y-auto">
        {steps.map((stepMeta) => {
          const isCompleted = completedSteps.has(stepMeta.step);
          const isCurrent = currentStep === stepMeta.step;
          const canAccess = canAccessStep(stepMeta.step);

          return (
            <div key={stepMeta.step} className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={() => canAccess && onStepClick(stepMeta.step)}
                disabled={!canAccess}
                className={cn(
                  'relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200',
                  'border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]',
                  isCompleted
                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white'
                    : isCurrent
                      ? 'border-[var(--color-primary-500)] bg-white text-[var(--color-primary-600)]'
                      : canAccess
                        ? 'border-[var(--color-border-default)] bg-white text-[var(--color-text-tertiary)]'
                        : 'cursor-not-allowed border-[var(--color-border-subtle)] bg-[var(--color-background-secondary)] text-[var(--color-text-quaternary)]',
                  canAccess && !isCurrent && 'cursor-pointer hover:border-[var(--color-primary-300)]'
                )}
                title={`${stepMeta.step}단계: ${stepMeta.title}${isCompleted ? ' (완료)' : isCurrent ? ' (진행 중)' : ''}`}
                aria-label={`${stepMeta.step}단계: ${stepMeta.title}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* 현재 단계 좌측 하이라이트 바 */}
                {isCurrent && (
                  <span className="absolute -left-[17px] h-full w-[3px] rounded-r bg-[var(--color-primary-500)]" />
                )}

                {isCompleted ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : canAccess ? (
                  <span className="text-xs font-semibold">{stepMeta.step}</span>
                ) : (
                  <Lock className="h-3 w-3" />
                )}
              </button>
              <span
                className={cn(
                  'text-[10px] leading-tight select-none',
                  isCompleted
                    ? 'text-[var(--color-primary-500)]'
                    : isCurrent
                      ? 'font-semibold text-[var(--color-primary-600)]'
                      : 'text-[var(--color-text-tertiary)]'
                )}
              >
                {stepMeta.shortTitle}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
