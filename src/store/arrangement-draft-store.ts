/**
 * Arrangement Draft Store
 *
 * 배치표 편집 상태 임시 저장/복원을 위한 store
 * - localStorage에 배치표별로 draft 데이터 저장
 * - 7일 만료 정책
 * - 페이지 이탈 후 복귀 시 복원 지원
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkflowStep, SeatAssignment } from './arrangement-store';
import type { GridLayout } from '@/types/grid';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'ArrangementDraftStore' });

// Draft 데이터 만료 기간 (7일)
const DRAFT_EXPIRY_DAYS = 7;
const DRAFT_EXPIRY_MS = DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * 워크플로우 상태 (직렬화 가능한 형태)
 * - Set → Array 변환
 */
export interface SerializableWorkflowState {
    currentStep: WorkflowStep;
    completedSteps: WorkflowStep[]; // Set → Array
    isWizardMode: boolean;
    expandedSections: WorkflowStep[]; // Set → Array
}

/**
 * 배치표별 임시 저장 데이터
 */
export interface ArrangementDraftData {
    arrangementId: string;
    savedAt: string; // ISO 8601 timestamp
    version: number;
    workflow: SerializableWorkflowState;
    gridLayout: GridLayout | null;
    assignments: Record<string, SeatAssignment>;
}

/**
 * Draft Store 상태
 */
interface DraftStoreState {
    // 배치표 ID → Draft 데이터 매핑
    drafts: Record<string, ArrangementDraftData>;
}

/**
 * Draft Store 액션
 */
interface DraftStoreActions {
    // Draft 저장
    saveDraft: (arrangementId: string, data: Omit<ArrangementDraftData, 'arrangementId' | 'savedAt' | 'version'>) => void;
    // Draft 로드 (만료 확인 포함)
    loadDraft: (arrangementId: string) => ArrangementDraftData | null;
    // Draft 존재 여부 확인
    hasDraft: (arrangementId: string) => boolean;
    // Draft 삭제
    deleteDraft: (arrangementId: string) => void;
    // 만료된 Draft 정리
    clearExpiredDrafts: () => number;
    // Draft 메타데이터 조회 (복원 다이얼로그용)
    getDraftMeta: (arrangementId: string) => {
        savedAt: Date;
        currentStep: WorkflowStep;
        assignedCount: number;
    } | null;
}

export type DraftStore = DraftStoreState & DraftStoreActions;

/**
 * Draft Store
 */
export const useArrangementDraftStore = create<DraftStore>()(
    persist(
        (set, get) => ({
            drafts: {},

            saveDraft: (arrangementId, data) => {
                const draftData: ArrangementDraftData = {
                    arrangementId,
                    savedAt: new Date().toISOString(),
                    version: 1,
                    ...data,
                };

                set((state) => ({
                    drafts: {
                        ...state.drafts,
                        [arrangementId]: draftData,
                    },
                }));

                logger.debug(`[AutoSave] Draft saved for ${arrangementId}`, {
                    step: data.workflow.currentStep,
                    assignedCount: Object.keys(data.assignments).length,
                });
            },

            loadDraft: (arrangementId) => {
                const { drafts } = get();
                const draft = drafts[arrangementId];

                if (!draft) {
                    return null;
                }

                // 만료 확인
                const savedAt = new Date(draft.savedAt).getTime();
                const now = Date.now();
                if (now - savedAt > DRAFT_EXPIRY_MS) {
                    logger.debug(`Draft expired for ${arrangementId}, deleting...`);
                    get().deleteDraft(arrangementId);
                    return null;
                }

                return draft;
            },

            hasDraft: (arrangementId) => {
                const draft = get().loadDraft(arrangementId);
                return draft !== null;
            },

            deleteDraft: (arrangementId) => {
                set((state) => {
                    const { [arrangementId]: _, ...rest } = state.drafts;
                    logger.debug(`Draft deleted for ${arrangementId}`);
                    return { drafts: rest };
                });
            },

            clearExpiredDrafts: () => {
                const { drafts } = get();
                const now = Date.now();
                let clearedCount = 0;

                const validDrafts: Record<string, ArrangementDraftData> = {};

                Object.entries(drafts).forEach(([id, draft]) => {
                    const savedAt = new Date(draft.savedAt).getTime();
                    if (now - savedAt <= DRAFT_EXPIRY_MS) {
                        validDrafts[id] = draft;
                    } else {
                        clearedCount++;
                        logger.debug(`Cleared expired draft for ${id}`);
                    }
                });

                if (clearedCount > 0) {
                    set({ drafts: validDrafts });
                    logger.info(`Cleared ${clearedCount} expired draft(s)`);
                }

                return clearedCount;
            },

            getDraftMeta: (arrangementId) => {
                const draft = get().loadDraft(arrangementId);
                if (!draft) return null;

                return {
                    savedAt: new Date(draft.savedAt),
                    currentStep: draft.workflow.currentStep,
                    assignedCount: Object.keys(draft.assignments).length,
                };
            },
        }),
        {
            name: 'arrangement-drafts', // localStorage key
            partialize: (state) => ({
                drafts: state.drafts,
            }),
        }
    )
);

/**
 * 워크플로우 상태를 직렬화 가능한 형태로 변환
 */
export function serializeWorkflowState(workflow: {
    currentStep: WorkflowStep;
    completedSteps: Set<WorkflowStep>;
    isWizardMode: boolean;
    expandedSections: Set<WorkflowStep>;
}): SerializableWorkflowState {
    return {
        currentStep: workflow.currentStep,
        completedSteps: Array.from(workflow.completedSteps),
        isWizardMode: workflow.isWizardMode,
        expandedSections: Array.from(workflow.expandedSections),
    };
}

/**
 * 직렬화된 워크플로우 상태를 원래 형태로 변환
 */
export function deserializeWorkflowState(serialized: SerializableWorkflowState): {
    currentStep: WorkflowStep;
    completedSteps: Set<WorkflowStep>;
    isWizardMode: boolean;
    expandedSections: Set<WorkflowStep>;
} {
    return {
        currentStep: serialized.currentStep,
        completedSteps: new Set(serialized.completedSteps),
        isWizardMode: serialized.isWizardMode,
        expandedSections: new Set(serialized.expandedSections),
    };
}
