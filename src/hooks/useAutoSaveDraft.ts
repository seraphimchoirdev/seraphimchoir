/**
 * useAutoSaveDraft Hook
 *
 * 배치표 편집 상태를 자동으로 localStorage에 저장하는 훅
 * - debounce 2초: 빈번한 저장 방지
 * - 30초 주기 백업 저장
 * - 상태 변경 감지 시 자동 저장
 */
import { useCallback, useEffect, useRef } from 'react';

import { createLogger } from '@/lib/logger';

import { serializeWorkflowState, useArrangementDraftStore } from '@/store/arrangement-draft-store';
import { useArrangementStore } from '@/store/arrangement-store';

const logger = createLogger({ prefix: 'AutoSaveDraft' });

// 자동 저장 debounce 시간 (ms)
const AUTO_SAVE_DEBOUNCE_MS = 2000;

// 백업 저장 주기 (ms)
const BACKUP_SAVE_INTERVAL_MS = 30000;

interface UseAutoSaveDraftOptions {
  /** 자동 저장 활성화 여부 (기본: true) */
  enabled?: boolean;
  /** 읽기 전용 모드에서는 저장 비활성화 */
  isReadOnly?: boolean;
}

/**
 * 배치표 편집 상태 자동 저장 훅
 *
 * @param arrangementId 배치표 ID
 * @param options 옵션
 */
export function useAutoSaveDraft(arrangementId: string, options: UseAutoSaveDraftOptions = {}) {
  const { enabled = true, isReadOnly = false } = options;

  const { workflow, gridLayout, assignments } = useArrangementStore();
  const { saveDraft } = useArrangementDraftStore();

  // debounce 타이머 ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 백업 인터벌 ref
  const backupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // 마지막 저장 상태 해시 (불필요한 저장 방지)
  const lastSaveHashRef = useRef<string>('');

  // 현재 상태의 해시 계산 (변경 감지용)
  const computeStateHash = useCallback(() => {
    return JSON.stringify({
      currentStep: workflow.currentStep,
      completedSteps: Array.from(workflow.completedSteps).sort(),
      isWizardMode: workflow.isWizardMode,
      gridRows: gridLayout?.rows,
      gridCapacities: gridLayout?.rowCapacities,
      assignmentKeys: Object.keys(assignments).sort(),
    });
  }, [workflow, gridLayout, assignments]);

  // 실제 저장 함수
  const performSave = useCallback(() => {
    if (!enabled || isReadOnly) return;

    const currentHash = computeStateHash();

    // 이전 저장과 동일하면 스킵
    if (currentHash === lastSaveHashRef.current) {
      return;
    }

    saveDraft(arrangementId, {
      workflow: serializeWorkflowState(workflow),
      gridLayout,
      assignments,
    });

    lastSaveHashRef.current = currentHash;
  }, [
    arrangementId,
    enabled,
    isReadOnly,
    workflow,
    gridLayout,
    assignments,
    saveDraft,
    computeStateHash,
  ]);

  // debounced 저장
  const debouncedSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, AUTO_SAVE_DEBOUNCE_MS);
  }, [performSave]);

  // 상태 변경 시 자동 저장 트리거
  useEffect(() => {
    if (!enabled || isReadOnly) return;

    // 초기 로드 시에는 저장하지 않음 (1단계, 빈 assignments)
    if (
      workflow.currentStep === 1 &&
      Object.keys(assignments).length === 0 &&
      !gridLayout?.isAIRecommended
    ) {
      return;
    }

    debouncedSave();
  }, [
    enabled,
    isReadOnly,
    workflow.currentStep,
    workflow.completedSteps,
    workflow.isWizardMode,
    gridLayout,
    assignments,
    debouncedSave,
  ]);

  // 백업 저장 인터벌 설정
  useEffect(() => {
    if (!enabled || isReadOnly) return;

    backupIntervalRef.current = setInterval(() => {
      logger.debug('[Backup] Periodic save triggered');
      performSave();
    }, BACKUP_SAVE_INTERVAL_MS);

    return () => {
      if (backupIntervalRef.current) {
        clearInterval(backupIntervalRef.current);
      }
    };
  }, [enabled, isReadOnly, performSave]);

  // 페이지 이탈 시 저장 (beforeunload)
  useEffect(() => {
    if (!enabled || isReadOnly) return;

    const handleBeforeUnload = () => {
      // debounce 대기 중인 저장이 있으면 즉시 실행
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      performSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // cleanup 시에도 저장
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, isReadOnly, performSave]);

  // 클린업
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (backupIntervalRef.current) {
        clearInterval(backupIntervalRef.current);
      }
    };
  }, []);

  return {
    /** 수동 저장 트리거 */
    saveNow: performSave,
  };
}
