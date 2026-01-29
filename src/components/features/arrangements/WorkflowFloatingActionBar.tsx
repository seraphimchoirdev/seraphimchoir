'use client';

import { ReactNode } from 'react';

import { WORKFLOW_STEPS, WorkflowStep } from '@/store/arrangement-store';

interface WorkflowFloatingActionBarProps {
  currentStep: WorkflowStep;
  isVisible: boolean;
  children: ReactNode;
}

/**
 * Compact 모드에서 현재 단계의 액션 버튼을 화면 하단에 플로팅 표시
 *
 * AttendanceList 플로팅 패턴 재사용
 */
export default function WorkflowFloatingActionBar({
  currentStep,
  isVisible,
  children,
}: WorkflowFloatingActionBarProps) {
  if (!isVisible) return null;

  const stepMeta = WORKFLOW_STEPS[currentStep];

  return (
    <div className="animate-in slide-in-from-bottom-4 fixed right-0 bottom-20 left-0 z-40 hidden px-4 duration-300 sm:block lg:bottom-6">
      <div className="mx-auto w-fit max-w-lg rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-3 shadow-lg">
        {/* 현재 단계 라벨 */}
        <div className="mb-2 text-xs font-medium text-[var(--color-text-tertiary)]">
          {stepMeta.step}단계: {stepMeta.title}
        </div>
        {/* 단계별 액션 컨텐츠 */}
        {children}
      </div>
    </div>
  );
}
