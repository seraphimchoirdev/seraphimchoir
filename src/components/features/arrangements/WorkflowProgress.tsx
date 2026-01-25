'use client';

import { Check, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';

import { WORKFLOW_STEPS, WorkflowStep, useArrangementStore } from '@/store/arrangement-store';

/**
 * 워크플로우 진행 상태 표시 컴포넌트
 *
 * 7단계 워크플로우의 진행 상태를 시각화합니다.
 *
 * ```
 * [✓]───[●]───[○]───[○]───[○]───[○]───[○]
 *  1     2     3     4     5     6     7
 * ```
 */
export default function WorkflowProgress() {
  const { workflow, goToStep, canAccessStep } = useArrangementStore();
  const { currentStep, completedSteps, isWizardMode } = workflow;

  const steps = Object.values(WORKFLOW_STEPS);

  return (
    <div className="w-full">
      {/* 모드 표시 */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {isWizardMode ? '가이드 모드' : '자유 편집 모드'}
        </span>
        <span className="text-xs text-[var(--color-text-tertiary)]">{currentStep} / 7 단계</span>
      </div>

      {/* Progress Bar - 데스크톱 */}
      <div className="relative hidden items-center justify-between sm:flex">
        {/* 배경 라인 */}
        <div className="absolute top-4 right-6 left-6 h-0.5 bg-[var(--color-border-subtle)]" />

        {/* 완료된 구간 라인 */}
        <div
          className="absolute top-4 left-6 h-0.5 bg-[var(--color-primary-500)] transition-all duration-300"
          style={{
            width: `${((currentStep - 1) / 6) * (100 - (12 * 100) / 100)}%`,
          }}
        />

        {/* 단계 노드들 */}
        {steps.map((stepMeta) => {
          const isCompleted = completedSteps.has(stepMeta.step);
          const isCurrent = currentStep === stepMeta.step;
          const canAccess = canAccessStep(stepMeta.step);

          return (
            <StepNode
              key={stepMeta.step}
              step={stepMeta.step}
              title={stepMeta.shortTitle}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              canAccess={canAccess}
              onClick={() => canAccess && goToStep(stepMeta.step)}
            />
          );
        })}
      </div>

      {/* Progress Bar - 모바일 (스크롤 가능) */}
      <div className="-mx-2 overflow-x-auto px-2 pb-2 sm:hidden">
        <div className="relative flex min-w-max items-center gap-1">
          {steps.map((stepMeta, index) => {
            const isCompleted = completedSteps.has(stepMeta.step);
            const isCurrent = currentStep === stepMeta.step;
            const canAccess = canAccessStep(stepMeta.step);

            return (
              <div key={stepMeta.step} className="flex items-center">
                <StepNodeMobile
                  step={stepMeta.step}
                  title={stepMeta.shortTitle}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                  canAccess={canAccess}
                  onClick={() => canAccess && goToStep(stepMeta.step)}
                />
                {/* 연결선 (마지막 제외) */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 w-4 transition-colors',
                      isCompleted
                        ? 'bg-[var(--color-primary-500)]'
                        : 'bg-[var(--color-border-subtle)]'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 개별 단계 노드 (데스크톱용)
 */
interface StepNodeProps {
  step: WorkflowStep;
  title: string;
  isCompleted: boolean;
  isCurrent: boolean;
  canAccess: boolean;
  onClick: () => void;
}

function StepNode({ step, title, isCompleted, isCurrent, canAccess, onClick }: StepNodeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canAccess}
      className={cn(
        'z-10 flex flex-col items-center gap-1 transition-all duration-200',
        'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-2',
        canAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
      )}
      aria-label={`${step}단계: ${title}${isCompleted ? ' (완료)' : isCurrent ? ' (진행 중)' : ''}`}
      aria-current={isCurrent ? 'step' : undefined}
    >
      {/* 노드 아이콘 */}
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200',
          'border-2',
          isCompleted
            ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white'
            : isCurrent
              ? 'border-[var(--color-primary-500)] bg-white text-[var(--color-primary-600)]'
              : canAccess
                ? 'border-[var(--color-border-default)] bg-white text-[var(--color-text-tertiary)]'
                : 'border-[var(--color-border-subtle)] bg-[var(--color-background-secondary)] text-[var(--color-text-quaternary)]'
        )}
      >
        {isCompleted ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : canAccess ? (
          <span className="text-xs font-semibold">{step}</span>
        ) : (
          <Lock className="h-3 w-3" />
        )}
      </div>

      {/* 라벨 */}
      <span
        className={cn(
          'max-w-[50px] text-center text-[10px] leading-tight font-medium',
          isCurrent
            ? 'text-[var(--color-primary-600)]'
            : isCompleted
              ? 'text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-tertiary)]'
        )}
      >
        {title}
      </span>
    </button>
  );
}

/**
 * 개별 단계 노드 (모바일용 - 컴팩트)
 */
function StepNodeMobile({
  step,
  title,
  isCompleted,
  isCurrent,
  canAccess,
  onClick,
}: StepNodeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canAccess}
      className={cn(
        'flex flex-col items-center gap-0.5 transition-all duration-200',
        'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]',
        canAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
      )}
      aria-label={`${step}단계: ${title}${isCompleted ? ' (완료)' : isCurrent ? ' (진행 중)' : ''}`}
    >
      {/* 노드 아이콘 */}
      <div
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200',
          'border-2',
          isCompleted
            ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white'
            : isCurrent
              ? 'border-[var(--color-primary-500)] bg-white text-[var(--color-primary-600)] ring-2 ring-[var(--color-primary-200)]'
              : canAccess
                ? 'border-[var(--color-border-default)] bg-white text-[var(--color-text-tertiary)]'
                : 'border-[var(--color-border-subtle)] bg-[var(--color-background-secondary)] text-[var(--color-text-quaternary)]'
        )}
      >
        {isCompleted ? (
          <Check className="h-3 w-3" strokeWidth={3} />
        ) : (
          <span className="text-[10px] font-semibold">{step}</span>
        )}
      </div>

      {/* 라벨 (현재 단계만 표시) */}
      {isCurrent && (
        <span className="text-[9px] font-medium whitespace-nowrap text-[var(--color-primary-600)]">
          {title}
        </span>
      )}
    </button>
  );
}
