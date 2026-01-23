'use client';

import { useEffect, useRef } from 'react';
import { useArrangementStore, WorkflowStep } from '@/store/arrangement-store';
import { createLogger } from '@/lib/logger';

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
 * - 1단계 (AI 추천 분배): gridLayout이 설정되고 수동 설정이 아닐 때
 * - 2단계 (그리드 조정): gridLayout이 수동으로 설정되었을 때
 * - 3단계 (AI 자동배치): assignments에 멤버가 배치되었을 때
 * - 4단계 (수동 배치 조정): 미배치 멤버가 0일 때
 * - 5단계 (Offset 조정): rowOffsets가 설정되었을 때 (선택사항이므로 즉시 완료 가능)
 * - 6단계 (줄반장 지정): 줄반장이 1명 이상 지정되었을 때
 * - 7단계 (공유): 배치표가 SHARED 상태일 때
 *
 * @param totalMembers - 총 멤버 수 (미배치 계산용)
 * @param arrangementStatus - 현재 배치표 상태
 */
export function useWorkflowAutoAdvance(
  totalMembers: number,
  arrangementStatus?: string
) {
  const {
    gridLayout,
    assignments,
    workflow,
    completeStep,
    goToStep,
    isStepCompleted,
  } = useArrangementStore();

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

      // 2단계: 그리드 수동 조정 (gridLayout이 수동 설정됨)
      results.push({
        step: 2,
        isCompleted: !!gridLayout?.isManuallyConfigured,
        reason: '그리드가 수동으로 설정됨',
      });

      // 3단계: AI 자동배치 (멤버가 배치됨)
      results.push({
        step: 3,
        isCompleted: assignmentsCount > 0,
        reason: `${assignmentsCount}명 배치됨`,
      });

      // 4단계: 수동 배치 조정 (미배치 멤버 = 0)
      const unassignedCount = Math.max(0, totalMembers - assignmentsCount);
      results.push({
        step: 4,
        isCompleted: totalMembers > 0 && unassignedCount === 0,
        reason: unassignedCount === 0 ? '모든 멤버 배치 완료' : `${unassignedCount}명 미배치`,
      });

      // 5단계: Offset 조정 (선택사항 - 항상 완료 가능)
      // rowOffsets가 설정되었거나, 사용자가 건너뛰기 선택
      results.push({
        step: 5,
        isCompleted: rowOffsetsCount > 0 || isStepCompleted(5),
        reason: rowOffsetsCount > 0 ? `${rowOffsetsCount}개 행 오프셋 설정` : '건너뛰기 가능',
      });

      // 6단계: 줄반장 지정 (1명 이상 지정)
      results.push({
        step: 6,
        isCompleted: rowLeaderCount > 0,
        reason: `${rowLeaderCount}명 줄반장 지정됨`,
      });

      // 7단계: 공유 (SHARED 또는 CONFIRMED 상태)
      results.push({
        step: 7,
        isCompleted: arrangementStatus === 'SHARED' || arrangementStatus === 'CONFIRMED',
        reason: arrangementStatus === 'SHARED' ? '공유됨' : arrangementStatus === 'CONFIRMED' ? '확정됨' : '미공유',
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
