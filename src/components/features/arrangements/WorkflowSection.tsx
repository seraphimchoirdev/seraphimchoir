'use client';

import { Check, ChevronDown, ChevronRight, Lock } from 'lucide-react';

import { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { cn } from '@/lib/utils';

import { WORKFLOW_STEPS, WorkflowStep, useArrangementStore } from '@/store/arrangement-store';

interface WorkflowSectionProps {
  /** 워크플로우 단계 번호 */
  step: WorkflowStep;
  /** 섹션 내용 */
  children: ReactNode;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 단계 완료 시 다음 단계로 자동 이동 여부 */
  autoAdvance?: boolean;
  /** 섹션 완료 표시 (외부에서 제어) */
  isCompleted?: boolean;
  /** 단계 완료 가능 여부 (false면 "이 단계 완료" 버튼 비활성화) */
  canComplete?: boolean;
  /** 완료 불가 시 안내 메시지 */
  cannotCompleteMessage?: string;
  /** "이 단계 완료" 버튼 숨김 여부 (자동 진행되는 단계에서 사용) */
  hideCompleteButton?: boolean;
}

/**
 * 워크플로우 단계 섹션 래퍼
 *
 * Collapsible 스타일로 각 워크플로우 단계를 감싸며,
 * 단계 상태에 따라 헤더 스타일과 접근성을 제어합니다.
 *
 * ```tsx
 * <WorkflowSection step={1}>
 *   <GridSettingsPanel ... />
 * </WorkflowSection>
 * ```
 */
export default function WorkflowSection({
  step,
  children,
  className,
  isCompleted: externalCompleted,
  canComplete,
  cannotCompleteMessage,
  hideCompleteButton,
}: WorkflowSectionProps) {
  const { workflow, toggleSection, goToStep, canAccessStep, completeStep } = useArrangementStore();
  const { currentStep, completedSteps, expandedSections, isWizardMode } = workflow;

  const stepMeta = WORKFLOW_STEPS[step];
  const isExpanded = expandedSections.has(step);
  const isCompleted = externalCompleted ?? completedSteps.has(step);
  const isCurrent = currentStep === step;
  const canAccess = canAccessStep(step);

  /**
   * 헤더 클릭 핸들러
   * - 접근 가능하면 토글
   * - 위자드 모드에서는 해당 단계로 이동
   */
  const handleHeaderClick = () => {
    if (!canAccess) return;

    if (isWizardMode) {
      // 위자드 모드: 해당 단계로 이동 (자동으로 섹션 펼침)
      goToStep(step);
    } else {
      // 자유 모드: 섹션 토글만
      toggleSection(step);
    }
  };

  /**
   * 섹션 완료 핸들러 (하위 컴포넌트에서 호출)
   */
  const handleComplete = () => {
    completeStep(step);
  };

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={() => handleHeaderClick()}
      className={cn(
        'overflow-hidden rounded-lg border transition-all duration-200',
        isCurrent
          ? 'border-[var(--color-primary-400)] ring-1 ring-[var(--color-primary-200)]'
          : isCompleted
            ? 'border-[var(--color-success-300)]'
            : canAccess
              ? 'border-[var(--color-border-default)]'
              : 'border-[var(--color-border-subtle)] opacity-60',
        className
      )}
    >
      {/* 헤더 */}
      <CollapsibleTrigger asChild>
        <button
          type="button"
          disabled={!canAccess}
          className={cn(
            'flex w-full items-center justify-between px-4 py-3 text-left transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-inset',
            isCurrent
              ? 'bg-[var(--color-primary-50)]'
              : isCompleted
                ? 'bg-[var(--color-success-50)]'
                : 'bg-[var(--color-surface)] hover:bg-[var(--color-background-secondary)]',
            !canAccess && 'cursor-not-allowed'
          )}
          aria-expanded={isExpanded}
          aria-disabled={!canAccess}
        >
          {/* 좌측: 단계 번호 + 제목 */}
          <div className="flex items-center gap-3">
            {/* 단계 아이콘 */}
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                isCompleted
                  ? 'bg-[var(--color-success-500)] text-white'
                  : isCurrent
                    ? 'bg-[var(--color-primary-500)] text-white'
                    : canAccess
                      ? 'bg-[var(--color-background-tertiary)] text-[var(--color-text-secondary)]'
                      : 'bg-[var(--color-background-secondary)] text-[var(--color-text-quaternary)]'
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" strokeWidth={3} />
              ) : canAccess ? (
                step
              ) : (
                <Lock className="h-3 w-3" />
              )}
            </div>

            {/* 제목 */}
            <span
              className={cn(
                'text-sm font-semibold',
                isCurrent
                  ? 'text-[var(--color-primary-700)]'
                  : isCompleted
                    ? 'text-[var(--color-success-700)]'
                    : canAccess
                      ? 'text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-tertiary)]'
              )}
            >
              {stepMeta.title}
            </span>
          </div>

          {/* 우측: 상태 배지 + 화살표 */}
          <div className="flex items-center gap-2">
            {/* 완료 배지 */}
            {isCompleted && (
              <span className="rounded-full bg-[var(--color-success-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-success-600)]">
                완료
              </span>
            )}

            {/* 진행 중 배지 */}
            {isCurrent && !isCompleted && (
              <span className="animate-pulse rounded-full bg-[var(--color-primary-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary-600)]">
                진행 중
              </span>
            )}

            {/* 펼침/접힘 아이콘 */}
            {canAccess && (
              <div className="text-[var(--color-text-tertiary)]">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      {/* 컨텐츠 */}
      <CollapsibleContent className="data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
        <div
          className={cn(
            'border-t p-4',
            isCurrent
              ? 'border-[var(--color-primary-200)] bg-white'
              : isCompleted
                ? 'border-[var(--color-success-200)]'
                : 'border-[var(--color-border-subtle)]'
          )}
        >
          {children}

          {/* 단계 완료/다음 버튼 (위자드 모드일 때, hideCompleteButton이 아닐 때) */}
          {isWizardMode && isCurrent && !isCompleted && !hideCompleteButton && (
            <div className="mt-4 flex flex-col items-end gap-2 border-t border-[var(--color-border-subtle)] pt-4">
              {canComplete === false && cannotCompleteMessage && (
                <p className="text-xs text-[var(--color-text-tertiary)]">{cannotCompleteMessage}</p>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={handleComplete}
                disabled={canComplete === false}
                className="gap-1"
              >
                <Check className="h-4 w-4" />이 단계 완료
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>

      {/* 애니메이션 스타일 */}
      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            height: 0;
          }
          to {
            opacity: 1;
            height: var(--radix-collapsible-content-height);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 1;
            height: var(--radix-collapsible-content-height);
          }
          to {
            opacity: 0;
            height: 0;
          }
        }

        .animate-slideDown {
          animation: slideDown 200ms ease-out;
        }

        .animate-slideUp {
          animation: slideUp 200ms ease-out;
        }
      `}</style>
    </Collapsible>
  );
}

/**
 * 워크플로우 섹션 컨텍스트 - 하위 컴포넌트에서 단계 완료를 호출할 수 있게 함
 */
export { WorkflowSection };
