'use client';

import { useEffect, useRef } from 'react';

import { createLogger } from '@/lib/logger';

import { WorkflowStep, useArrangementStore } from '@/store/arrangement-store';

const logger = createLogger({ prefix: 'WorkflowAutoAdvance' });

/**
 * 자동 단계 완료 조건 평가 결과
 */
interface StepCompletionResult {
  step: WorkflowStep;
  isCompleted: boolean;
  reason?: string;
}

/**
 * 워크플로우 자동 진행 훅
 *
 * 각 단계의 완료 조건을 모니터링하고, 조건 충족 시 자동으로 단계를 완료 처리합니다.
 * 위자드 모드에서는 다음 단계로 자동 이동도 수행합니다.
 *
 * 완료 조건:
 * - 1단계 (AI 추천 분배): AI가 추천하면 자동 완료
 * - 2단계 (그리드 조정): 수동 완료 전용 ("이 단계 완료" 버튼 필요)
 * - 3단계 (AI 자동배치): 멤버가 배치되면 자동 완료
 * - 4단계 (수동 배치 조정): 수동 완료 전용 ("이 단계 완료" 버튼 필요)
 * - 5단계 (Offset 조정): 수동 완료 전용 ("이 단계 완료" 버튼 필요)
 * - 6단계 (줄반장 지정): 수동 완료 전용 ("이 단계 완료" 버튼 필요)
 * - 7단계 (공유): 공유/확정 시 자동 완료
 *
 * @param totalMembers - 총 멤버 수 (미배치 계산용)
 * @param arrangementStatus - 현재 배치표 상태
 */
export function useWorkflowAutoAdvance(totalMembers: number, arrangementStatus?: string) {
  const { gridLayout, assignments, workflow, completeStep, goToStep, isStepCompleted } =
    useArrangementStore();

  // 이전 상태 추적 (불필요한 업데이트 방지)
  const prevStatesRef = useRef<{
    gridLayout: typeof gridLayout;
    assignmentsCount: number;
    rowLeaderCount: number;
    rowOffsetsCount: number;
    status: string | undefined;
  }>({
    gridLayout: null,
    assignmentsCount: 0,
    rowLeaderCount: 0,
    rowOffsetsCount: 0,
    status: undefined,
  });

  useEffect(() => {
    // 위자드 모드가 아니면 자동 진행 비활성화
    if (!workflow.isWizardMode) return;

    const assignmentValues = Object.values(assignments);
    const assignmentsCount = assignmentValues.length;
    const rowLeaderCount = assignmentValues.filter((a) => a.isRowLeader).length;
    const rowOffsetsCount = gridLayout?.rowOffsets ? Object.keys(gridLayout.rowOffsets).length : 0;

    // 상태 변화 감지
    const prev = prevStatesRef.current;
    const hasChange =
      prev.gridLayout !== gridLayout ||
      prev.assignmentsCount !== assignmentsCount ||
      prev.rowLeaderCount !== rowLeaderCount ||
      prev.rowOffsetsCount !== rowOffsetsCount ||
      prev.status !== arrangementStatus;

    if (!hasChange) return;

    // 상태 업데이트
    prevStatesRef.current = {
      gridLayout,
      assignmentsCount,
      rowLeaderCount,
      rowOffsetsCount,
      status: arrangementStatus,
    };

    // 각 단계별 완료 조건 평가
    const evaluateSteps = (): StepCompletionResult[] => {
      const results: StepCompletionResult[] = [];

      // 1단계: AI 추천 분배 (AI가 실제로 추천한 경우에만 완료)
      results.push({
        step: 1,
        isCompleted: !!gridLayout && gridLayout.isAIRecommended === true,
        reason: 'AI 추천으로 그리드 설정됨',
      });

      // 2단계: 그리드 수동 조정 (수동 완료 전용 - 자동 완료 비활성화)
      // 사용자가 "이 단계 완료" 버튼을 눌러야만 완료됨
      results.push({
        step: 2,
        isCompleted: false,
        reason: '수동 완료 필요',
      });

      // 3단계: AI 자동배치 (멤버가 배치됨)
      results.push({
        step: 3,
        isCompleted: assignmentsCount > 0,
        reason: `${assignmentsCount}명 배치됨`,
      });

      // 4단계: 수동 배치 조정 (수동 완료 전용 - 자동 완료 비활성화)
      // 사용자가 "이 단계 완료" 버튼을 눌러야만 완료됨
      results.push({
        step: 4,
        isCompleted: false,
        reason: '수동 완료 필요',
      });

      // 5단계: Offset 조정 (수동 완료 전용 - 자동 완료 비활성화)
      // 사용자가 "이 단계 완료" 버튼을 눌러야만 완료됨
      results.push({
        step: 5,
        isCompleted: false,
        reason: '수동 완료 필요',
      });

      // 6단계: 줄반장 지정 (수동 완료 전용 - 자동 완료 비활성화)
      // 사용자가 "이 단계 완료" 버튼을 눌러야만 완료됨
      results.push({
        step: 6,
        isCompleted: false,
        reason: '수동 완료 필요',
      });

      // 7단계: 공유 (SHARED 또는 CONFIRMED 상태)
      results.push({
        step: 7,
        isCompleted: arrangementStatus === 'SHARED' || arrangementStatus === 'CONFIRMED',
        reason:
          arrangementStatus === 'SHARED'
            ? '공유됨'
            : arrangementStatus === 'CONFIRMED'
              ? '확정됨'
              : '미공유',
      });

      return results;
    };

    const results = evaluateSteps();

    // 완료된 단계 처리
    results.forEach((result) => {
      if (result.isCompleted && !isStepCompleted(result.step)) {
        logger.debug(`단계 ${result.step} 자동 완료: ${result.reason}`);
        completeStep(result.step);
      }
    });

    // 현재 단계가 완료되었으면 다음 단계로 자동 이동 (위자드 모드에서만)
    const currentStepResult = results.find((r) => r.step === workflow.currentStep);
    if (
      currentStepResult?.isCompleted &&
      workflow.currentStep < 7 &&
      !workflow.completedSteps.has(workflow.currentStep)
    ) {
      // 다음 단계로 이동은 completeStep 후에 수행
      setTimeout(() => {
        const nextStep = (workflow.currentStep + 1) as WorkflowStep;
        logger.debug(`다음 단계로 자동 이동: ${workflow.currentStep} → ${nextStep}`);
        goToStep(nextStep);
      }, 300); // 애니메이션 완료 후 이동
    }
  }, [
    gridLayout,
    assignments,
    workflow.isWizardMode,
    workflow.currentStep,
    workflow.completedSteps,
    totalMembers,
    arrangementStatus,
    completeStep,
    goToStep,
    isStepCompleted,
  ]);
}

/**
 * 특정 단계의 완료 조건을 수동으로 트리거하는 헬퍼
 */
export function useCompleteCurrentStep() {
  const { workflow, completeStep, nextStep } = useArrangementStore();

  const complete = () => {
    completeStep(workflow.currentStep);
    if (workflow.currentStep < 7) {
      setTimeout(() => nextStep(), 300);
    }
  };

  return { complete, currentStep: workflow.currentStep };
}

/**
 * 특정 단계를 건너뛰는 헬퍼 (선택적 단계용)
 */
export function useSkipStep() {
  const { workflow, completeStep, nextStep } = useArrangementStore();

  const skip = (step: WorkflowStep) => {
    completeStep(step);
    if (workflow.currentStep === step && step < 7) {
      setTimeout(() => nextStep(), 300);
    }
  };

  return { skip };
}
