/**
 * useRestoreDraft Hook
 *
 * 페이지 진입 시 draft 복원 로직을 관리하는 훅
 * - draft 존재 여부 확인
 * - 복원 다이얼로그 표시 결정
 * - 복원/새로 시작 선택 처리
 */
import { useCallback, useEffect, useState } from 'react';

import { createLogger } from '@/lib/logger';

import {
  ArrangementDraftData,
  deserializeWorkflowState,
  useArrangementDraftStore,
} from '@/store/arrangement-draft-store';
import { WorkflowStep, useArrangementStore } from '@/store/arrangement-store';

const logger = createLogger({ prefix: 'RestoreDraft' });

export type RestoreOption = 'restore' | 'useDb' | 'startFresh';

export interface DraftInfo {
  savedAt: Date;
  currentStep: WorkflowStep;
  stepTitle: string;
  assignedCount: number;
}

interface UseRestoreDraftOptions {
  /** DB에 저장된 데이터가 있는지 여부 */
  dbHasData: boolean;
  /** 페이지 로드 완료 여부 */
  isPageLoaded: boolean;
}

interface UseRestoreDraftReturn {
  /** 복원 다이얼로그 표시 여부 */
  showRestoreDialog: boolean;
  /** Draft 정보 (다이얼로그 표시용) */
  draftInfo: DraftInfo | null;
  /** DB 데이터 존재 여부 (다이얼로그 옵션 분기용) */
  hasDbData: boolean;
  /** 복원 선택 처리 */
  handleRestoreChoice: (choice: RestoreOption) => void;
  /** 다이얼로그 닫기 */
  closeDialog: () => void;
  /** Draft 복원이 완료되어 페이지 초기화를 건너뛰어야 하는지 */
  skipInitialization: boolean;
}

// 워크플로우 단계 이름 매핑
const STEP_TITLES: Record<WorkflowStep, string> = {
  1: 'AI 추천 분배',
  2: '좌석 그리드 조정',
  3: 'AI 자동배치',
  4: '수동 배치 조정',
  5: '행별 Offset 조정',
  6: '줄반장 지정',
  7: '배치표 공유',
};

/**
 * Draft 복원 훅
 *
 * @param arrangementId 배치표 ID
 * @param options 옵션
 */
export function useRestoreDraft(
  arrangementId: string,
  options: UseRestoreDraftOptions
): UseRestoreDraftReturn {
  const { dbHasData, isPageLoaded } = options;

  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [draftInfo, setDraftInfo] = useState<DraftInfo | null>(null);
  const [skipInitialization, setSkipInitialization] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { loadDraft, deleteDraft, getDraftMeta } = useArrangementDraftStore();
  const { setGridLayout, setAssignments, resetWorkflow } = useArrangementStore();

  // 워크플로우 상태 복원 (arrangement-store에 restoreWorkflowState 추가 필요)
  const restoreWorkflowState = useArrangementStore((state) => state.restoreWorkflowState);

  // 초기화 - Draft 존재 여부 확인 (localStorage에서 읽어서 상태 초기화)
  useEffect(() => {
    if (!isPageLoaded || initialized) return;

    const meta = getDraftMeta(arrangementId);

    if (meta) {
      logger.debug(`Draft found for ${arrangementId}`, meta);

      setDraftInfo({
        savedAt: meta.savedAt,
        currentStep: meta.currentStep,
        stepTitle: STEP_TITLES[meta.currentStep],
        assignedCount: meta.assignedCount,
      });

      // 다이얼로그 표시 (DB 데이터 유무와 관계없이 항상 물어봄)
      setShowRestoreDialog(true);
      setSkipInitialization(true); // 페이지 기본 초기화 건너뛰기
    }

    setInitialized(true);
  }, [arrangementId, isPageLoaded, initialized, getDraftMeta]);

  // Draft 데이터를 store에 적용 (handleRestoreChoice보다 먼저 선언)
  const applyDraft = useCallback(
    (draft: ArrangementDraftData) => {
      // 워크플로우 상태 복원
      const workflowState = deserializeWorkflowState(draft.workflow);
      restoreWorkflowState?.(workflowState);

      // 그리드 레이아웃 복원
      if (draft.gridLayout) {
        setGridLayout(draft.gridLayout);
      }

      // 좌석 배치 복원
      if (draft.assignments && Object.keys(draft.assignments).length > 0) {
        const seats = Object.values(draft.assignments);
        setAssignments(seats);
      }

      logger.debug(
        `Applied draft: step=${draft.workflow.currentStep}, assignments=${Object.keys(draft.assignments).length}`
      );
    },
    [restoreWorkflowState, setGridLayout, setAssignments]
  );

  // 복원 선택 처리
  const handleRestoreChoice = useCallback(
    (choice: RestoreOption) => {
      logger.debug(`User selected: ${choice}`);

      switch (choice) {
        case 'restore': {
          // Draft에서 복원
          const draft = loadDraft(arrangementId);
          if (draft) {
            applyDraft(draft);
            logger.info(`Draft restored for ${arrangementId}`);
          }
          break;
        }
        case 'useDb': {
          // DB 데이터 사용 (페이지 기본 초기화 진행)
          deleteDraft(arrangementId);
          setSkipInitialization(false);
          resetWorkflow();
          logger.info(`Using DB data for ${arrangementId}`);
          break;
        }
        case 'startFresh': {
          // 새로 시작 (Draft 삭제, 워크플로우 리셋)
          deleteDraft(arrangementId);
          setSkipInitialization(false);
          resetWorkflow();
          logger.info(`Starting fresh for ${arrangementId}`);
          break;
        }
      }

      setShowRestoreDialog(false);
    },
    [arrangementId, loadDraft, deleteDraft, resetWorkflow, applyDraft]
  );

  const closeDialog = useCallback(() => {
    setShowRestoreDialog(false);
    // 다이얼로그를 닫으면 DB 데이터 사용으로 처리
    handleRestoreChoice('useDb');
  }, [handleRestoreChoice]);

  return {
    showRestoreDialog,
    draftInfo,
    hasDbData: dbHasData,
    handleRestoreChoice,
    closeDialog,
    skipInitialization,
  };
}
