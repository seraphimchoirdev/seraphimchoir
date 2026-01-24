
import { create } from 'zustand';
import type { Database } from '@/types/database.types';
import type { GridLayout, RowOffsetValue } from '@/types/grid';
import { OFFSET_PRESETS } from '@/types/grid';
import {
    minimalReassignment,
    type MinimalReassignmentResult,
    type MemberSeatPreference,
} from '@/lib/minimal-reassignment';
import {
    type PartZone,
    DEFAULT_PART_ZONES,
    findNearestEmptySeatInExpandedZone,
} from '@/lib/part-zone-analyzer';
import { selectRowLeaders, type RowLeaderCandidate } from '@/lib/row-leader-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'ArrangementStore' });

// ============================================
// Workflow State Types (Progressive Disclosure)
// ============================================

/**
 * 워크플로우 단계 (1~7)
 * 1: AI 추천 분배
 * 2: 좌석 그리드 수동 조정
 * 3: AI 자동배치
 * 4: 수동 배치 조정
 * 5: 행별 Offset 조정
 * 6: 줄반장 지정
 * 7: 자리배치표 공유
 */
export type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * 워크플로우 단계 메타데이터
 */
export interface WorkflowStepMeta {
  step: WorkflowStep;
  title: string;
  shortTitle: string;
  description: string;
}

/**
 * 워크플로우 단계 정의
 */
export const WORKFLOW_STEPS: Record<WorkflowStep, WorkflowStepMeta> = {
  1: {
    step: 1,
    title: 'AI 추천 분배',
    shortTitle: 'AI 분배',
    description: '출석 인원을 기반으로 줄별 인원을 자동 추천합니다.',
  },
  2: {
    step: 2,
    title: '좌석 그리드 조정',
    shortTitle: '그리드',
    description: '줄 수와 줄별 인원을 수동으로 조정합니다.',
  },
  3: {
    step: 3,
    title: 'AI 자동배치',
    shortTitle: 'AI 배치',
    description: '파트, 키, 경력을 고려하여 좌석을 자동 배치합니다.',
  },
  4: {
    step: 4,
    title: '수동 배치 조정',
    shortTitle: '수동 조정',
    description: '클릭-클릭 방식으로 좌석을 미세 조정합니다.',
  },
  5: {
    step: 5,
    title: '행별 Offset 조정',
    shortTitle: 'Offset',
    description: '지휘자 시야 확보를 위해 줄 위치를 조정합니다.',
  },
  6: {
    step: 6,
    title: '줄반장 지정',
    shortTitle: '줄반장',
    description: '각 줄의 대표를 지정합니다.',
  },
  7: {
    step: 7,
    title: '배치표 공유',
    shortTitle: '공유',
    description: '배치표를 저장하고 공유합니다.',
  },
};

/**
 * 워크플로우 상태
 */
export interface WorkflowState {
  /** 현재 활성화된 단계 */
  currentStep: WorkflowStep;
  /** 완료된 단계 목록 */
  completedSteps: Set<WorkflowStep>;
  /** 위자드 모드 (가이드 모드) 활성화 여부 */
  isWizardMode: boolean;
  /** 각 단계 섹션의 펼침/접힘 상태 */
  expandedSections: Set<WorkflowStep>;
}

type Part = Database['public']['Enums']['part'];

/**
 * 파트의 side (좌/우) 반환
 * - SOPRANO, TENOR: 왼쪽 (left)
 * - ALTO, BASS, SPECIAL: 오른쪽 (right)
 */
export function getPartSide(part: Part): 'left' | 'right' {
    switch (part) {
        case 'SOPRANO':
        case 'TENOR':
            return 'left';
        case 'ALTO':
        case 'BASS':
        case 'SPECIAL':
        default:
            return 'right';
    }
}

export interface SeatAssignment {
    memberId: string;
    memberName: string;
    part: Part;
    row: number;
    col: number;
    isRowLeader?: boolean;
}

/**
 * 미배치 멤버 정보
 */
export interface UnassignedMember {
    memberId: string;
    memberName: string;
    part: Part;
    /** 원래 위치 (있으면) */
    originalPosition?: { row: number; col: number };
    /** 미배치 사유 */
    reason: string;
}

/**
 * 자동 배치 결과
 */
export interface AutoPlacementResult {
    /** 배치 성공한 멤버 */
    placed: Array<UnassignedMember & { newPosition: { row: number; col: number }; searchLevel: string }>;
    /** 여전히 미배치인 멤버 */
    stillUnassigned: UnassignedMember[];
}

// History management types
interface HistoryState {
    assignments: Record<string, SeatAssignment>;
}

interface HistoryManager {
    past: HistoryState[];
    future: HistoryState[];
}

const MAX_HISTORY_SIZE = 50;

// Helper function to save current state to history
const saveToHistory = (state: ArrangementState): HistoryManager => ({
    past: [...state._history.past, { assignments: { ...state.assignments } }].slice(-MAX_HISTORY_SIZE),
    future: [], // Clear future on new action
});

interface ArrangementState {
    // Key format: "row-col" (e.g., "1-1") - 1-based index
    assignments: Record<string, SeatAssignment>;

    // Grid layout configuration
    gridLayout: GridLayout | null;

    // Selection state for click-click interaction
    selectedMemberId: string | null;
    selectedMemberName: string | null;
    selectedMemberPart: Part | null;
    selectedSource: 'sidebar' | 'grid' | null;
    selectedPosition: { row: number; col: number } | null;

    // Row leader mode state
    rowLeaderMode: boolean;

    // History state for undo/redo
    _history: HistoryManager;

    // ============================================
    // Workflow State (Progressive Disclosure)
    // ============================================
    workflow: WorkflowState;

    // Actions
    setAssignments: (assignments: SeatAssignment[]) => void;
    setGridLayout: (layout: GridLayout | null) => void;
    setGridLayoutAndCompact: (layout: GridLayout) => void;

    // 그리드 설정 유지 옵션이 있는 레이아웃 설정
    setGridLayoutPreserveManual: (layout: GridLayout, preserveManual: boolean) => void;
    // 행별 오프셋 설정
    setRowOffset: (row: number, offset: RowOffsetValue) => void;
    // 그리드를 수동 설정으로 마킹
    markGridAsManual: () => void;
    // 모든 행별 오프셋 초기화
    clearRowOffsets: () => void;
    // 지그재그 토글 (none ↔ even)
    applyZigzagToggle: () => void;
    // 오프셋 프리셋 적용
    applyOffsetPreset: (presetId: string) => void;
    placeMember: (member: Omit<SeatAssignment, 'row' | 'col'>, row: number, col: number) => void;
    removeMember: (row: number, col: number) => void;
    moveMember: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
    clearArrangement: () => void;
    clearCurrentStepOnly: (step: WorkflowStep) => void;

    // Selection actions for click-click interaction
    selectMemberFromSidebar: (memberId: string, memberName: string, part: Part) => void;
    selectMemberFromGrid: (row: number, col: number) => void;
    clearSelection: () => void;
    handleSeatClick: (row: number, col: number) => void;

    // Row leader actions
    toggleRowLeaderMode: () => void;
    toggleRowLeader: (row: number, col: number) => void;

    // 줄반장 자동 지정/해제 액션
    autoAssignRowLeaders: () => RowLeaderCandidate[];
    clearAllRowLeaders: () => void;

    // History actions for undo/redo
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
    clearHistory: () => void;

    // ============================================
    // Workflow Actions (Progressive Disclosure)
    // ============================================

    /** 특정 단계로 이동 */
    goToStep: (step: WorkflowStep) => void;
    /** 다음 단계로 이동 */
    nextStep: () => void;
    /** 이전 단계로 이동 */
    prevStep: () => void;
    /** 특정 단계를 완료로 표시 */
    completeStep: (step: WorkflowStep) => void;
    /** 특정 단계를 미완료로 표시 */
    uncompleteStep: (step: WorkflowStep) => void;
    /** 위자드 모드 토글 */
    toggleWizardMode: () => void;
    /** 섹션 펼침/접힘 토글 */
    toggleSection: (step: WorkflowStep) => void;
    /** 모든 섹션 펼치기 */
    expandAllSections: () => void;
    /** 모든 섹션 접기 */
    collapseAllSections: () => void;
    /** 워크플로우 상태 초기화 */
    resetWorkflow: () => void;
    /** 워크플로우 상태 복원 (Draft에서 복원 시 사용) */
    restoreWorkflowState: (state: {
        currentStep: WorkflowStep;
        completedSteps: Set<WorkflowStep>;
        isWizardMode: boolean;
        expandedSections: Set<WorkflowStep>;
    }) => void;
    /** 특정 단계가 완료되었는지 확인 */
    isStepCompleted: (step: WorkflowStep) => boolean;
    /** 특정 단계에 접근 가능한지 확인 (이전 단계가 완료되어야 함) */
    canAccessStep: (step: WorkflowStep) => boolean;

    // Minimal reassignment action
    applyMinimalReassignment: (
        removedPosition: { row: number; col: number },
        newLayout: GridLayout,
        partZones?: Map<Part, PartZone>,
        preferences?: Map<string, MemberSeatPreference>
    ) => MinimalReassignmentResult;

    // 빈 좌석 탐색
    findEmptySeats: () => Array<{ row: number; col: number }>;

    // 미배치 멤버 자동 배치
    autoPlaceUnassignedMembers: (
        unassignedMembers: UnassignedMember[],
        partZones?: Map<Part, PartZone>,
        enableFallback?: boolean
    ) => AutoPlacementResult;

    // === 새로운 긴급 등단 불가 처리 함수들 (파트 영역 고려) ===

    /**
     * 같은 파트 멤버만 왼쪽으로 1칸씩 당기기
     * @param emptyRow 빈 자리 행 (1-based)
     * @param emptyCol 빈 자리 열 (1-based)
     * @param targetPart 당길 대상 파트 (같은 파트만 당김)
     */
    pullSamePartMembersLeft: (emptyRow: number, emptyCol: number, targetPart: Part) => void;

    /**
     * 특정 행의 용량을 파트 side에 따라 조정
     * @param row 행 번호 (1-based)
     * @param side 축소할 방향 ('left' | 'right')
     */
    shrinkRowFromSide: (row: number, side: 'left' | 'right') => void;

    /**
     * 뒷줄에서 앞줄로 같은 파트 멤버 1명 이동
     * @param frontRow 앞줄 행 번호 (1-based)
     * @param emptyCol 앞줄의 빈 열 (1-based)
     * @param part 이동할 파트
     * @returns 이동 성공 여부
     */
    crossRowFillFromBack: (frontRow: number, emptyCol: number, part: Part) => boolean;

    /**
     * 특정 행에서 파트의 마지막 빈 열 찾기 (당기기 후 빈 자리)
     * @param row 행 번호 (1-based)
     * @param part 파트
     * @returns 빈 열 번호 또는 null
     */
    findLastEmptyColForPart: (row: number, part: Part) => number | null;

    /**
     * 행 간 불균형 확인 (크로스-행 이동 필요 여부)
     * @param frontRow 앞줄 행 번호
     * @param part 파트
     * @param threshold 불균형 임계값 (기본: 2)
     * @returns 크로스-행 이동 필요 여부
     */
    shouldCrossRowMove: (frontRow: number, part: Part, threshold?: number) => boolean;

    /**
     * 모든 행의 빈 좌석을 컴팩션 (로드 시 자동 정리)
     * - 각 행에서 파트별로 빈 좌석을 찾아 당기기 수행
     * - 왼쪽 파트(SOPRANO/TENOR): 왼쪽으로 당김
     * - 오른쪽 파트(ALTO/BASS): 왼쪽으로 당김 (오른쪽 끝에서 빈 자리 생김)
     */
    compactAllRows: () => void;
}

// 워크플로우 초기 상태 생성 헬퍼
const createInitialWorkflowState = (): WorkflowState => ({
    currentStep: 1,
    completedSteps: new Set<WorkflowStep>(),
    isWizardMode: true, // 기본적으로 위자드 모드 활성화
    expandedSections: new Set<WorkflowStep>([1]), // 첫 번째 섹션만 펼침
});

export const useArrangementStore = create<ArrangementState>((set, get) => ({
    assignments: {},
    gridLayout: null,
    selectedMemberId: null,
    selectedMemberName: null,
    selectedMemberPart: null,
    selectedSource: null,
    selectedPosition: null,
    rowLeaderMode: false,
    _history: { past: [], future: [] },
    workflow: createInitialWorkflowState(),

    setAssignments: (assignmentsList) => {
        const newAssignments: Record<string, SeatAssignment> = {};
        assignmentsList.forEach((a) => {
            newAssignments[`${a.row}-${a.col}`] = a;
        });
        set((state) => ({
            _history: saveToHistory(state),
            assignments: newAssignments,
        }));
    },

    setGridLayout: (layout) => set({ gridLayout: layout }),

    /**
     * 그리드 레이아웃 설정 (수동 설정 보존 옵션)
     * @param layout 새 그리드 레이아웃
     * @param preserveManual true면 현재 그리드의 rowCapacities 유지, false면 새 레이아웃 적용
     */
    setGridLayoutPreserveManual: (layout, preserveManual) =>
        set((state) => {
            if (preserveManual && state.gridLayout) {
                // 수동 설정 보존: 현재 rowCapacities 유지, 다른 속성만 업데이트
                return {
                    gridLayout: {
                        ...layout,
                        rows: state.gridLayout.rows,
                        rowCapacities: state.gridLayout.rowCapacities,
                        rowOffsets: state.gridLayout.rowOffsets,
                        isManuallyConfigured: true,
                    },
                };
            }
            // 새 레이아웃 적용
            return { gridLayout: layout };
        }),

    /**
     * 행별 오프셋 설정
     * @param row 행 번호 (1-based)
     * @param offset 오프셋 값 (null = 기본 패턴 따름)
     */
    setRowOffset: (row, offset) =>
        set((state) => {
            if (!state.gridLayout) return state;

            const rowIndex = row - 1; // 0-based index for storage key
            const currentOffsets = state.gridLayout.rowOffsets || {};

            // null이면 해당 키 삭제, 아니면 설정
            let newOffsets: Record<number, RowOffsetValue>;
            if (offset === null) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [rowIndex]: _, ...rest } = currentOffsets;
                newOffsets = rest;
            } else {
                newOffsets = { ...currentOffsets, [rowIndex]: offset };
            }

            return {
                gridLayout: {
                    ...state.gridLayout,
                    rowOffsets: Object.keys(newOffsets).length > 0 ? newOffsets : undefined,
                    isManuallyConfigured: true,
                },
            };
        }),

    /**
     * 그리드를 수동 설정으로 마킹
     */
    markGridAsManual: () =>
        set((state) => {
            if (!state.gridLayout) return state;
            return {
                gridLayout: {
                    ...state.gridLayout,
                    isManuallyConfigured: true,
                },
            };
        }),

    /**
     * 모든 행별 오프셋 초기화
     */
    clearRowOffsets: () =>
        set((state) => {
            if (!state.gridLayout) return state;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { rowOffsets: _, ...rest } = state.gridLayout;
            return {
                gridLayout: {
                    ...rest,
                    rowOffsets: undefined,
                },
            };
        }),

    /**
     * 지그재그 패턴 토글 (none ↔ even)
     * - 지그재그 적용 시 개별 rowOffsets는 초기화됨
     * - 지휘자 시야 확보가 필요한 경우에만 활성화
     */
    applyZigzagToggle: () =>
        set((state) => {
            if (!state.gridLayout) return state;

            const currentPattern = state.gridLayout.zigzagPattern;
            const newPattern = currentPattern === 'none' ? 'even' : 'none';

            logger.debug(`지그재그 토글: ${currentPattern} → ${newPattern}`);

            return {
                gridLayout: {
                    ...state.gridLayout,
                    zigzagPattern: newPattern,
                    // 토글 시 개별 rowOffsets 초기화 (패턴과 충돌 방지)
                    rowOffsets: undefined,
                },
            };
        }),

    /**
     * 오프셋 프리셋 적용
     * @param presetId 프리셋 ID (straight, mountain, zigzag)
     */
    applyOffsetPreset: (presetId: string) =>
        set((state) => {
            if (!state.gridLayout) return state;

            const preset = OFFSET_PRESETS.find((p) => p.id === presetId);
            if (!preset) {
                logger.warn(`프리셋을 찾을 수 없음: ${presetId}`);
                return state;
            }

            const offsets = preset.getOffsets(state.gridLayout.rows);
            logger.debug(`프리셋 적용: ${preset.name}`, offsets);

            return {
                gridLayout: {
                    ...state.gridLayout,
                    zigzagPattern: 'none', // 프리셋 사용 시 zigzagPattern 비활성화
                    rowOffsets: Object.keys(offsets).length > 0 ? offsets : undefined,
                },
            };
        }),

    /**
     * 그리드 레이아웃 변경 (자동 재배치 없음)
     * - 새 그리드 경계 내에 있는 대원만 유지
     * - 경계 밖 대원은 미배치 상태가 됨 (MemberSidebar에 표시)
     * - 사용자가 수동으로 재배치
     */
    setGridLayoutAndCompact: (layout) =>
        set((state) => {
            const { rowCapacities } = layout;
            const currentAssignments = { ...state.assignments };
            const newAssignments: Record<string, SeatAssignment> = {};

            // 현재 배치를 순회하며 경계 내에 있는 것만 유지
            Object.values(currentAssignments).forEach((assignment) => {
                const { row, col } = assignment;
                const rowIndex = row - 1; // 0-based index
                const maxColInRow = rowCapacities[rowIndex] || 0;

                if (rowIndex >= 0 && rowIndex < rowCapacities.length && col <= maxColInRow) {
                    // 경계 내 - 유지
                    newAssignments[`${row}-${col}`] = assignment;
                }
                // 경계 외 - 자동으로 미배치가 됨 (assignments에서 제외)
            });

            return {
                _history: saveToHistory(state),
                gridLayout: layout,
                assignments: newAssignments,
            };
        }),

    placeMember: (member, row, col) =>
        set((state) => {
            const key = `${row}-${col}`;
            // If seat is occupied, we overwrite it (or could swap, but overwrite is simpler for now)
            return {
                _history: saveToHistory(state),
                assignments: {
                    ...state.assignments,
                    [key]: { ...member, row, col },
                },
            };
        }),

    removeMember: (row, col) =>
        set((state) => {
            const key = `${row}-${col}`;
            const { [key]: _removed, ...rest } = state.assignments;
            return {
                _history: saveToHistory(state),
                assignments: rest,
            };
        }),

    moveMember: (fromRow, fromCol, toRow, toCol) =>
        set((state) => {
            const fromKey = `${fromRow}-${fromCol}`;
            const toKey = `${toRow}-${toCol}`;
            const memberToMove = state.assignments[fromKey];

            if (!memberToMove) return state;

            const targetSeat = state.assignments[toKey];
            const newAssignments = { ...state.assignments };

            // Move member to new seat
            newAssignments[toKey] = { ...memberToMove, row: toRow, col: toCol };

            // If target seat was occupied, swap? Or just overwrite?
            // Let's implement SWAP logic as it's more intuitive
            if (targetSeat) {
                newAssignments[fromKey] = { ...targetSeat, row: fromRow, col: fromCol };
            } else {
                delete newAssignments[fromKey];
            }

            return {
                _history: saveToHistory(state),
                assignments: newAssignments,
            };
        }),

    clearArrangement: () =>
        set((state) => ({
            _history: saveToHistory(state),
            assignments: {},
            gridLayout: null,
        })),

    /**
     * 현재 워크플로우 단계만 초기화
     * 각 단계별로 해당 단계에서 작업한 내용만 되돌립니다.
     *
     * | 단계 | 단계명 | 초기화 동작 |
     * |------|--------|------------|
     * | 1 | AI 분배 | gridLayout을 null로 초기화 |
     * | 2 | 그리드 조정 | rowCapacities를 기본값(각 행 12명)으로 복원 |
     * | 3 | AI 자동배치 | assignments 초기화 (gridLayout 유지) |
     * | 4 | 수동 배치 조정 | assignments 초기화 (gridLayout 유지) |
     * | 5 | Offset 조정 | rowOffsets 제거 |
     * | 6 | 줄반장 지정 | 모든 isRowLeader를 false로 |
     * | 7 | 공유 | 초기화 불필요 |
     */
    clearCurrentStepOnly: (step: WorkflowStep) =>
        set((state) => {
            logger.debug(`단계 ${step}만 초기화`);

            switch (step) {
                case 1:
                    // AI 분배 단계: gridLayout만 초기화
                    return {
                        _history: saveToHistory(state),
                        gridLayout: null,
                        assignments: {},
                    };

                case 2:
                    // 그리드 조정 단계: rowCapacities를 기본값으로 복원 (rows 유지)
                    if (!state.gridLayout) return state;
                    const defaultCapacity = 12;
                    return {
                        _history: saveToHistory(state),
                        gridLayout: {
                            ...state.gridLayout,
                            rowCapacities: Array(state.gridLayout.rows).fill(defaultCapacity),
                            isManuallyConfigured: false,
                        },
                    };

                case 3:
                case 4:
                    // AI 자동배치 / 수동 배치 조정: assignments만 초기화 (gridLayout 유지)
                    return {
                        _history: saveToHistory(state),
                        assignments: {},
                    };

                case 5:
                    // Offset 조정 단계: rowOffsets만 제거
                    if (!state.gridLayout) return state;
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { rowOffsets: _, ...restGridLayout } = state.gridLayout;
                    return {
                        _history: saveToHistory(state),
                        gridLayout: {
                            ...restGridLayout,
                            rowOffsets: undefined,
                        },
                    };

                case 6:
                    // 줄반장 지정 단계: 자동 지정 후 수동 조정
                    // 1. 먼저 기존 줄반장 전체 해제
                    const assignmentsForStep6 = { ...state.assignments };
                    Object.keys(assignmentsForStep6).forEach((key) => {
                        if (assignmentsForStep6[key].isRowLeader) {
                            assignmentsForStep6[key] = { ...assignmentsForStep6[key], isRowLeader: false };
                        }
                    });

                    // 2. gridLayout이 있으면 자동으로 줄반장 지정
                    if (state.gridLayout) {
                        const candidates = selectRowLeaders(assignmentsForStep6, state.gridLayout);
                        candidates.forEach(({ row, col }) => {
                            const key = `${row}-${col}`;
                            if (assignmentsForStep6[key]) {
                                assignmentsForStep6[key] = { ...assignmentsForStep6[key], isRowLeader: true };
                            }
                        });
                        logger.debug(`6단계 진입: 줄반장 ${candidates.length}명 자동 지정`);
                    }

                    return {
                        _history: saveToHistory(state),
                        assignments: assignmentsForStep6,
                    };

                case 7:
                    // 공유 단계: 초기화 불필요
                    return state;

                default:
                    return state;
            }
        }),

    // Click-click interaction methods
    selectMemberFromSidebar: (memberId, memberName, part) =>
        set((state) => {
            // Toggle: if clicking the same member, deselect
            if (state.selectedMemberId === memberId && state.selectedSource === 'sidebar') {
                return {
                    selectedMemberId: null,
                    selectedMemberName: null,
                    selectedMemberPart: null,
                    selectedSource: null,
                    selectedPosition: null,
                };
            }

            // Select this member
            return {
                selectedMemberId: memberId,
                selectedMemberName: memberName,
                selectedMemberPart: part,
                selectedSource: 'sidebar' as const,
                selectedPosition: null,
            };
        }),

    selectMemberFromGrid: (row, col) =>
        set((state) => {
            const key = `${row}-${col}`;
            const assignment = state.assignments[key];

            if (!assignment) return state; // No member at this position

            // Toggle: if clicking the same seat, deselect
            if (
                state.selectedSource === 'grid' &&
                state.selectedPosition?.row === row &&
                state.selectedPosition?.col === col
            ) {
                return {
                    selectedMemberId: null,
                    selectedMemberName: null,
                    selectedMemberPart: null,
                    selectedSource: null,
                    selectedPosition: null,
                };
            }

            // Select this grid member
            return {
                selectedMemberId: assignment.memberId,
                selectedMemberName: assignment.memberName,
                selectedMemberPart: assignment.part,
                selectedSource: 'grid' as const,
                selectedPosition: { row, col },
            };
        }),

    clearSelection: () =>
        set({
            selectedMemberId: null,
            selectedMemberName: null,
            selectedMemberPart: null,
            selectedSource: null,
            selectedPosition: null,
        }),

    handleSeatClick: (row, col) => {
        const state = get();
        const seatKey = `${row}-${col}`;
        const existingAssignment = state.assignments[seatKey];

        // Case 1: Nothing selected
        if (!state.selectedMemberId) {
            if (existingAssignment) {
                // Occupied seat clicked → select from grid
                state.selectMemberFromGrid(row, col);
            }
            // Empty seat clicked → no action
            return;
        }

        // Case 2: Member selected from sidebar
        if (state.selectedSource === 'sidebar') {
            // 기존 위치 찾기 (경계 밖 멤버 재배치 시 중요)
            // "재배치 필요" 섹션의 멤버는 이미 assignments에 존재하므로,
            // 새 위치에 배치하기 전에 기존 위치를 삭제해야 중복이 발생하지 않음
            let oldKey: string | null = null;
            for (const [key, assignment] of Object.entries(state.assignments)) {
                if (assignment.memberId === state.selectedMemberId) {
                    oldKey = key;
                    break;
                }
            }

            // 기존 위치가 있고 대상 좌석과 다르면 먼저 삭제
            if (oldKey && oldKey !== seatKey) {
                set((s) => {
                    const { [oldKey!]: _, ...rest } = s.assignments;
                    return { assignments: rest };
                });
            }

            if (!existingAssignment) {
                // Empty seat → place member
                state.placeMember(
                    {
                        memberId: state.selectedMemberId,
                        memberName: state.selectedMemberName!,
                        part: state.selectedMemberPart!,
                    },
                    row,
                    col
                );
                state.clearSelection();
            } else {
                // Occupied seat → overwrite
                state.placeMember(
                    {
                        memberId: state.selectedMemberId,
                        memberName: state.selectedMemberName!,
                        part: state.selectedMemberPart!,
                    },
                    row,
                    col
                );
                state.clearSelection();
            }
        }

        // Case 3: Member selected from grid
        if (state.selectedSource === 'grid') {
            const selectedSeatKey = `${state.selectedPosition!.row}-${state.selectedPosition!.col}`;

            if (seatKey === selectedSeatKey) {
                // Same seat clicked → deselect
                state.clearSelection();
            } else {
                // Different seat → move or swap
                state.moveMember(
                    state.selectedPosition!.row,
                    state.selectedPosition!.col,
                    row,
                    col
                );
                state.clearSelection();
            }
        }
    },

    // Row leader mode toggle
    toggleRowLeaderMode: () =>
        set((state) => ({
            rowLeaderMode: !state.rowLeaderMode,
            // Clear selection when entering/exiting row leader mode
            selectedMemberId: null,
            selectedMemberName: null,
            selectedMemberPart: null,
            selectedSource: null,
            selectedPosition: null,
        })),

    // Toggle row leader status for a specific seat
    toggleRowLeader: (row, col) =>
        set((state) => {
            const key = `${row}-${col}`;
            const assignment = state.assignments[key];

            if (!assignment) return state; // No member at this seat

            return {
                _history: saveToHistory(state),
                assignments: {
                    ...state.assignments,
                    [key]: {
                        ...assignment,
                        isRowLeader: !assignment.isRowLeader,
                    },
                },
            };
        }),

    /**
     * 줄반장 자동 지정
     *
     * 패턴:
     * - 왼쪽 영역 (소프라노/테너) 3명: 1행, 3행 경계 소프라노 + 5행 경계 테너
     * - 오른쪽 영역 (알토/베이스) 5명: 1행 경계 알토 + 중간 알토 + 4,5,6행 경계 베이스
     *
     * @returns 지정된 줄반장 후보 배열
     */
    autoAssignRowLeaders: () => {
        const state = get();
        const { gridLayout, assignments } = state;

        if (!gridLayout) {
            logger.warn('gridLayout이 없어 자동 지정 불가');
            return [];
        }

        // 1. 먼저 기존 줄반장 전체 해제
        const newAssignments = { ...assignments };
        Object.keys(newAssignments).forEach((key) => {
            if (newAssignments[key].isRowLeader) {
                newAssignments[key] = { ...newAssignments[key], isRowLeader: false };
            }
        });

        // 2. 알고리즘으로 줄반장 후보 선정
        const candidates = selectRowLeaders(newAssignments, gridLayout);

        // 3. 선정된 후보에 줄반장 표시
        candidates.forEach(({ row, col }) => {
            const key = `${row}-${col}`;
            if (newAssignments[key]) {
                newAssignments[key] = { ...newAssignments[key], isRowLeader: true };
            }
        });

        // 4. 상태 업데이트
        set({
            _history: saveToHistory(state),
            assignments: newAssignments,
        });

        logger.debug(`자동 지정 완료: ${candidates.length}명`);
        return candidates;
    },

    /**
     * 모든 줄반장 해제
     */
    clearAllRowLeaders: () =>
        set((state) => {
            const newAssignments = { ...state.assignments };
            let clearedCount = 0;

            Object.keys(newAssignments).forEach((key) => {
                if (newAssignments[key].isRowLeader) {
                    newAssignments[key] = { ...newAssignments[key], isRowLeader: false };
                    clearedCount++;
                }
            });

            logger.debug(`전체 해제: ${clearedCount}명`);

            return {
                _history: saveToHistory(state),
                assignments: newAssignments,
            };
        }),

    // Undo action - restore previous state
    undo: () =>
        set((state) => {
            if (state._history.past.length === 0) return state;

            const previous = state._history.past[state._history.past.length - 1];
            const newPast = state._history.past.slice(0, -1);
            const currentSnapshot: HistoryState = { assignments: { ...state.assignments } };

            return {
                assignments: previous.assignments,
                _history: {
                    past: newPast,
                    future: [currentSnapshot, ...state._history.future],
                },
                // Clear selection to prevent invalid state
                selectedMemberId: null,
                selectedMemberName: null,
                selectedMemberPart: null,
                selectedSource: null,
                selectedPosition: null,
            };
        }),

    // Redo action - restore next state
    redo: () =>
        set((state) => {
            if (state._history.future.length === 0) return state;

            const next = state._history.future[0];
            const newFuture = state._history.future.slice(1);
            const currentSnapshot: HistoryState = { assignments: { ...state.assignments } };

            return {
                assignments: next.assignments,
                _history: {
                    past: [...state._history.past, currentSnapshot],
                    future: newFuture,
                },
                // Clear selection to prevent invalid state
                selectedMemberId: null,
                selectedMemberName: null,
                selectedMemberPart: null,
                selectedSource: null,
                selectedPosition: null,
            };
        }),

    // Check if undo is available
    canUndo: () => get()._history.past.length > 0,

    // Check if redo is available
    canRedo: () => get()._history.future.length > 0,

    // Clear history (used when loading new arrangement)
    clearHistory: () =>
        set({ _history: { past: [], future: [] } }),

    // Minimal reassignment: 긴급 등단 불가 시 최소 변동 재배치
    applyMinimalReassignment: (removedPosition, newLayout, partZones, preferences) => {
        const state = get();

        // 파트 영역이 제공되지 않으면 기본값 사용
        const zones = partZones || new Map(
            (['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] as Part[]).map(
                (part) => [part, DEFAULT_PART_ZONES[part]]
            )
        );

        // 재배치 알고리즘 실행
        const result = minimalReassignment(
            state.assignments,
            removedPosition,
            newLayout,
            zones,
            preferences
        );

        // 상태 업데이트
        set({
            _history: saveToHistory(state),
            gridLayout: newLayout,
            assignments: result.newAssignments,
            // 선택 상태 초기화
            selectedMemberId: null,
            selectedMemberName: null,
            selectedMemberPart: null,
            selectedSource: null,
            selectedPosition: null,
        });

        return result;
    },

    // 빈 좌석 탐색: 현재 그리드에서 비어있는 모든 좌석 반환
    findEmptySeats: () => {
        const state = get();
        const { gridLayout, assignments } = state;

        if (!gridLayout) return [];

        const emptySeats: Array<{ row: number; col: number }> = [];
        const { rowCapacities } = gridLayout;

        for (let rowIdx = 0; rowIdx < rowCapacities.length; rowIdx++) {
            const row = rowIdx + 1; // 1-based
            const maxCol = rowCapacities[rowIdx];

            for (let col = 1; col <= maxCol; col++) {
                const key = `${row}-${col}`;
                if (!assignments[key]) {
                    emptySeats.push({ row, col });
                }
            }
        }

        return emptySeats;
    },

    // 미배치 멤버 자동 배치
    autoPlaceUnassignedMembers: (unassignedMembers, partZones, enableFallback = false) => {
        const state = get();
        const { gridLayout, assignments } = state;

        if (!gridLayout || unassignedMembers.length === 0) {
            return { placed: [], stillUnassigned: unassignedMembers };
        }

        // 파트 영역 설정
        const zones = partZones || new Map(
            (['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] as Part[]).map(
                (part) => [part, DEFAULT_PART_ZONES[part]]
            )
        );

        // 빈 좌석 목록 (변경 가능)
        let emptySeats = get().findEmptySeats();
        const newAssignments = { ...assignments };

        const placed: AutoPlacementResult['placed'] = [];
        const stillUnassigned: UnassignedMember[] = [];

        // 각 미배치 멤버 처리
        for (const member of unassignedMembers) {
            const zone = zones.get(member.part) || DEFAULT_PART_ZONES[member.part];

            // 대상 위치 (원래 위치 또는 파트 영역 중앙)
            const targetPos = member.originalPosition || {
                row: Math.floor((zone.allowedRows[0] + zone.allowedRows[1]) / 2),
                col: zone.side === 'left' ? 3 : zone.side === 'right' ? gridLayout.rowCapacities[0] - 2 : Math.floor(gridLayout.rowCapacities[0] / 2),
            };

            // 확장 영역 탐색
            const result = findNearestEmptySeatInExpandedZone(
                targetPos,
                emptySeats,
                member.part,
                zone,
                gridLayout.rowCapacities,
                enableFallback
            );

            if (result) {
                const { row, col, searchLevel } = result;
                const key = `${row}-${col}`;

                // 배치 실행
                newAssignments[key] = {
                    memberId: member.memberId,
                    memberName: member.memberName,
                    part: member.part,
                    row,
                    col,
                    isRowLeader: false,
                };

                // 빈 좌석 목록에서 제거
                emptySeats = emptySeats.filter((s) => !(s.row === row && s.col === col));

                placed.push({
                    ...member,
                    newPosition: { row, col },
                    searchLevel,
                });

                logger.debug(`${member.memberName}(${member.part}) → (${row}, ${col}) [${searchLevel}]`);
            } else {
                stillUnassigned.push(member);
                logger.debug(`${member.memberName}(${member.part}) - 배치 실패: 빈 좌석 없음`);
            }
        }

        // 배치가 하나라도 성공했으면 상태 업데이트
        if (placed.length > 0) {
            set({
                _history: saveToHistory(state),
                assignments: newAssignments,
            });
        }

        return { placed, stillUnassigned };
    },

    // === 새로운 긴급 등단 불가 처리 함수들 구현 ===

    /**
     * 같은 파트 멤버만 왼쪽으로 1칸씩 당기기
     *
     * 동작:
     * 1. 빈 자리(emptyCol)의 오른쪽에서 시작
     * 2. 같은 파트 멤버를 만나면 왼쪽으로 1칸 이동
     * 3. 다른 파트 멤버를 만나면 즉시 중단 (파트 경계 보호)
     */
    pullSamePartMembersLeft: (emptyRow, emptyCol, targetPart) =>
        set((state) => {
            const { gridLayout, assignments } = state;
            if (!gridLayout) return state;

            const maxCol = gridLayout.rowCapacities[emptyRow - 1] || 0;
            const newAssignments = { ...assignments };

            // 현재 빈 자리 위치 (당기면서 이동)
            let currentEmptyCol = emptyCol;

            // 빈 자리 오른쪽부터 순회
            for (let col = emptyCol + 1; col <= maxCol; col++) {
                const key = `${emptyRow}-${col}`;
                const member = newAssignments[key];

                // 빈 자리면 건너뜀
                if (!member) continue;

                // 다른 파트면 당기기 중단 (파트 경계 보호)
                if (member.part !== targetPart) {
                    logger.debug(`파트 경계 도달: ${member.part} ≠ ${targetPart}, 당기기 중단`);
                    break;
                }

                // 같은 파트면 왼쪽으로 1칸 당기기
                const newKey = `${emptyRow}-${currentEmptyCol}`;
                newAssignments[newKey] = { ...member, col: currentEmptyCol };
                delete newAssignments[key];

                logger.debug(`${member.memberName}(${member.part}) ${col}→${currentEmptyCol}`);

                // 다음 빈 자리는 방금 이동한 위치
                currentEmptyCol = col;
            }

            return {
                _history: saveToHistory(state),
                assignments: newAssignments,
            };
        }),

    /**
     * 특정 행의 용량을 파트 side에 따라 조정
     *
     * 동작:
     * - 'right': 행 끝(오른쪽)에서 1칸 축소 (단순히 용량 -1)
     * - 'left': 왼쪽에서 축소 (모든 멤버를 오른쪽으로 1칸 이동 후 용량 -1)
     */
    shrinkRowFromSide: (row, side) =>
        set((state) => {
            const { gridLayout, assignments } = state;
            if (!gridLayout) return state;

            const newCapacities = [...gridLayout.rowCapacities];
            const rowIndex = row - 1;

            // 유효성 검사
            if (rowIndex < 0 || rowIndex >= newCapacities.length) return state;
            if (newCapacities[rowIndex] <= 1) return state;

            const newAssignments = { ...assignments };

            if (side === 'right') {
                // 오른쪽에서 축소: 단순히 용량 -1
                // 마지막 열에 멤버가 있으면 미배치됨 (호출 전에 당기기 완료 가정)
                const lastCol = newCapacities[rowIndex];
                const lastKey = `${row}-${lastCol}`;
                if (newAssignments[lastKey]) {
                    logger.warn(`${row}행 ${lastCol}열에 멤버가 있어 미배치됨`);
                    delete newAssignments[lastKey];
                }
                newCapacities[rowIndex]--;
                logger.debug(`${row}행 오른쪽 축소: ${newCapacities[rowIndex] + 1}→${newCapacities[rowIndex]}`);
            } else {
                // 왼쪽 파트(SOPRANO/TENOR) 축소:
                // pullSamePartMembersLeft 후 빈 자리는 파트 경계(중앙 부근)에 있음
                // 빈 자리의 오른쪽 멤버들을 왼쪽으로 당겨 빈 자리 채움
                // 그 후 오른쪽 끝 용량 축소 (오른쪽 끝이 비어있으므로 안전)
                const maxCol = newCapacities[rowIndex];

                // 행에서 첫 번째 빈 자리 찾기
                let emptyCol = -1;
                for (let col = 1; col <= maxCol; col++) {
                    if (!newAssignments[`${row}-${col}`]) {
                        emptyCol = col;
                        break;
                    }
                }

                if (emptyCol > 0) {
                    // 빈 자리 오른쪽 멤버들을 왼쪽으로 당기기
                    logger.debug(`${row}행 빈 자리 발견: col ${emptyCol}, 오른쪽 멤버들 왼쪽으로 당김`);
                    for (let col = emptyCol + 1; col <= maxCol; col++) {
                        const key = `${row}-${col}`;
                        const member = newAssignments[key];
                        if (member) {
                            const newKey = `${row}-${col - 1}`;
                            newAssignments[newKey] = { ...member, col: col - 1 };
                            delete newAssignments[key];
                        }
                    }
                }

                // 오른쪽 끝 용량 축소 (이제 마지막 열은 비어있음)
                newCapacities[rowIndex]--;
                logger.debug(`${row}행 왼쪽 파트 축소 완료: ${newCapacities[rowIndex] + 1}→${newCapacities[rowIndex]}`);
            }

            return {
                _history: saveToHistory(state),
                gridLayout: {
                    ...gridLayout,
                    rowCapacities: newCapacities,
                },
                assignments: newAssignments,
            };
        }),

    /**
     * 뒷줄에서 앞줄로 같은 파트 멤버 1명 이동
     *
     * @returns 이동 성공 여부
     */
    crossRowFillFromBack: (frontRow, emptyCol, part) => {
        const state = get();
        const { gridLayout, assignments } = state;

        if (!gridLayout) return false;

        const backRow = frontRow + 1;
        if (backRow > gridLayout.rowCapacities.length) return false;

        const backRowCapacity = gridLayout.rowCapacities[backRow - 1] || 0;

        // 뒷줄에서 같은 파트 멤버 중 가장 적합한 후보 찾기
        // - 파트 side에 따라 가장 가까운 위치의 멤버 선택
        const partSide = getPartSide(part);
        let candidateMember: SeatAssignment | null = null;
        let candidateCol: number | null = null;

        if (partSide === 'left') {
            // 왼쪽 파트: 가장 오른쪽(파트 영역 끝)에 있는 멤버 선택
            for (let col = backRowCapacity; col >= 1; col--) {
                const key = `${backRow}-${col}`;
                const member = assignments[key];
                if (member && member.part === part) {
                    candidateMember = member;
                    candidateCol = col;
                    break;
                }
            }
        } else {
            // 오른쪽 파트: 가장 오른쪽에 있는 멤버 선택 (행 끝에서 앞으로)
            for (let col = backRowCapacity; col >= 1; col--) {
                const key = `${backRow}-${col}`;
                const member = assignments[key];
                if (member && member.part === part) {
                    candidateMember = member;
                    candidateCol = col;
                    break;
                }
            }
        }

        if (!candidateMember || candidateCol === null) {
            logger.debug(`${backRow}행에서 ${part} 멤버를 찾을 수 없음`);
            return false;
        }

        // 뒷줄 멤버를 앞줄로 이동
        const newAssignments = { ...assignments };
        const oldKey = `${backRow}-${candidateCol}`;
        const newKey = `${frontRow}-${emptyCol}`;

        newAssignments[newKey] = {
            ...candidateMember,
            row: frontRow,
            col: emptyCol,
        };
        delete newAssignments[oldKey];

        logger.debug(`${candidateMember.memberName}(${part}) ${backRow}행${candidateCol}열 → ${frontRow}행${emptyCol}열`);

        set({
            _history: saveToHistory(state),
            assignments: newAssignments,
        });

        return true;
    },

    /**
     * 특정 행에서 파트의 마지막 빈 열 찾기
     */
    findLastEmptyColForPart: (row, part) => {
        const { gridLayout, assignments } = get();
        if (!gridLayout) return null;

        const maxCol = gridLayout.rowCapacities[row - 1] || 0;
        const partSide = getPartSide(part);

        // 파트 side에 따라 탐색 방향 결정
        if (partSide === 'right') {
            // 오른쪽 파트: 오른쪽 끝에서 왼쪽으로 탐색
            for (let col = maxCol; col >= 1; col--) {
                const key = `${row}-${col}`;
                if (!assignments[key]) {
                    return col;
                }
            }
        } else {
            // 왼쪽 파트: 중앙에서 왼쪽으로 탐색 (왼쪽 끝에 빈 자리)
            const midCol = Math.ceil(maxCol / 2);
            for (let col = midCol; col >= 1; col--) {
                const key = `${row}-${col}`;
                if (!assignments[key]) {
                    return col;
                }
            }
        }

        return null;
    },

    /**
     * 행 간 불균형 확인 (크로스-행 이동 필요 여부)
     */
    shouldCrossRowMove: (frontRow, part, threshold = 2) => {
        const { gridLayout, assignments } = get();
        if (!gridLayout) return false;

        const backRow = frontRow + 1;
        if (backRow > gridLayout.rowCapacities.length) return false;

        // 각 행의 해당 파트 멤버 수 계산
        let frontRowCount = 0;
        let backRowCount = 0;

        Object.values(assignments).forEach((a) => {
            if (a.part === part) {
                if (a.row === frontRow) frontRowCount++;
                if (a.row === backRow) backRowCount++;
            }
        });

        // 뒷줄이 앞줄보다 threshold 이상 많으면 이동 필요
        const shouldMove = (backRowCount - frontRowCount) >= threshold;

        if (shouldMove) {
            logger.debug(`불균형 감지: ${frontRow}행(${frontRowCount}명) vs ${backRow}행(${backRowCount}명), 차이: ${backRowCount - frontRowCount}명`);
        }

        return shouldMove;
    },

    /**
     * 모든 행의 빈 좌석을 컴팩션 (로드 시 자동 정리)
     *
     * 알고리즘:
     * 1. 각 행을 순회하며 빈 좌석 찾기
     * 2. 빈 좌석 오른쪽의 멤버들을 왼쪽으로 당기기
     * 3. 파트 경계 무시하고 모든 멤버 당기기 (로드 시에는 이미 저장된 배치이므로)
     */
    compactAllRows: () =>
        set((state) => {
            const { gridLayout, assignments } = state;
            if (!gridLayout) return state;

            const newAssignments = { ...assignments };
            let totalCompacted = 0;

            // 각 행을 순회
            for (let row = 1; row <= gridLayout.rowCapacities.length; row++) {
                const maxCol = gridLayout.rowCapacities[row - 1] || 0;
                if (maxCol === 0) continue;

                // ⭐ 해당 행의 모든 멤버를 수집 (그리드 용량과 무관하게)
                // assignments 객체를 직접 순회하여 해당 행에 속한 멤버 모두 찾기
                const rowMembers: Array<{ col: number; member: SeatAssignment }> = [];

                Object.entries(newAssignments).forEach(([key, member]) => {
                    const [rowStr] = key.split('-');
                    if (parseInt(rowStr, 10) === row) {
                        rowMembers.push({ col: member.col, member });
                    }
                });

                // 열 순서로 정렬
                rowMembers.sort((a, b) => a.col - b.col);

                // 빈 좌석이 없으면 스킵 (멤버 수 == 현재 용량)
                if (rowMembers.length === maxCol && rowMembers.every((m, i) => m.col === i + 1)) {
                    continue;
                }

                // 기존 멤버들의 키 삭제 (용량 밖 멤버 포함)
                rowMembers.forEach(({ col }) => {
                    delete newAssignments[`${row}-${col}`];
                });

                // 멤버들을 1열부터 연속으로 재배치
                rowMembers.forEach(({ member }, index) => {
                    const newCol = index + 1;
                    const newKey = `${row}-${newCol}`;
                    newAssignments[newKey] = { ...member, col: newCol };

                    if (member.col !== newCol) {
                        logger.debug(`${row}행: ${member.memberName} ${member.col}→${newCol}`);
                        totalCompacted++;
                    }
                });
            }

            if (totalCompacted > 0) {
                logger.debug(`총 ${totalCompacted}명 좌석 정리 완료`);
            }

            return { assignments: newAssignments };
        }),

    // ============================================
    // Workflow Actions (Progressive Disclosure)
    // ============================================

    /**
     * 특정 단계로 이동
     * 완료된 단계로 돌아가면 해당 단계를 '진행 중' 상태로 변경
     */
    goToStep: (step) =>
        set((state) => {
            const newCompleted = new Set(state.workflow.completedSteps);

            // 완료된 단계로 돌아가면 해당 단계를 미완료로 변경
            if (newCompleted.has(step)) {
                newCompleted.delete(step);
                logger.debug(`단계 ${step}로 돌아감 - 완료 상태 해제`);
            }

            const newExpanded = new Set(state.workflow.expandedSections);
            // 위자드 모드에서는 현재 단계만 펼침
            if (state.workflow.isWizardMode) {
                newExpanded.clear();
                newExpanded.add(step);
            } else {
                // 자유 모드에서는 추가로 펼침
                newExpanded.add(step);
            }

            logger.debug(`워크플로우 단계 이동: ${state.workflow.currentStep} → ${step}`);

            return {
                workflow: {
                    ...state.workflow,
                    currentStep: step,
                    completedSteps: newCompleted,
                    expandedSections: newExpanded,
                },
            };
        }),

    /**
     * 다음 단계로 이동
     */
    nextStep: () =>
        set((state) => {
            const { currentStep } = state.workflow;
            if (currentStep >= 7) return state;

            const nextStep = (currentStep + 1) as WorkflowStep;
            const newExpanded = new Set(state.workflow.expandedSections);

            if (state.workflow.isWizardMode) {
                newExpanded.clear();
                newExpanded.add(nextStep);
            } else {
                newExpanded.add(nextStep);
            }

            logger.debug(`워크플로우 다음 단계: ${currentStep} → ${nextStep}`);

            return {
                workflow: {
                    ...state.workflow,
                    currentStep: nextStep,
                    expandedSections: newExpanded,
                },
            };
        }),

    /**
     * 이전 단계로 이동
     */
    prevStep: () =>
        set((state) => {
            const { currentStep } = state.workflow;
            if (currentStep <= 1) return state;

            const prevStep = (currentStep - 1) as WorkflowStep;
            const newExpanded = new Set(state.workflow.expandedSections);

            if (state.workflow.isWizardMode) {
                newExpanded.clear();
                newExpanded.add(prevStep);
            } else {
                newExpanded.add(prevStep);
            }

            logger.debug(`워크플로우 이전 단계: ${currentStep} → ${prevStep}`);

            return {
                workflow: {
                    ...state.workflow,
                    currentStep: prevStep,
                    expandedSections: newExpanded,
                },
            };
        }),

    /**
     * 특정 단계를 완료로 표시
     */
    completeStep: (step) =>
        set((state) => {
            const newCompleted = new Set(state.workflow.completedSteps);
            newCompleted.add(step);

            logger.debug(`단계 ${step} 완료 표시`);

            // 마지막 단계(7)가 아니면 다음 단계로 이동
            const nextStep = step < 7 ? ((step + 1) as WorkflowStep) : step;
            const newExpanded = new Set(state.workflow.expandedSections);

            if (step < 7 && state.workflow.isWizardMode) {
                // 위자드 모드: 현재 단계 접고 다음 단계 펼침
                newExpanded.clear();
                newExpanded.add(nextStep);
            }

            // 5단계 완료 → 6단계 진입 시 줄반장 자동 지정
            let newAssignments = state.assignments;
            if (step === 5 && state.gridLayout) {
                // 1. 기존 줄반장 전체 해제
                newAssignments = { ...state.assignments };
                Object.keys(newAssignments).forEach((key) => {
                    if (newAssignments[key].isRowLeader) {
                        newAssignments[key] = { ...newAssignments[key], isRowLeader: false };
                    }
                });

                // 2. 자동으로 줄반장 지정
                const candidates = selectRowLeaders(newAssignments, state.gridLayout);
                candidates.forEach(({ row, col }) => {
                    const key = `${row}-${col}`;
                    if (newAssignments[key]) {
                        newAssignments[key] = { ...newAssignments[key], isRowLeader: true };
                    }
                });
                logger.debug(`6단계 진입: 줄반장 ${candidates.length}명 자동 지정`);
            }

            return {
                workflow: {
                    ...state.workflow,
                    completedSteps: newCompleted,
                    currentStep: nextStep,
                    expandedSections: newExpanded,
                },
                assignments: newAssignments,
            };
        }),

    /**
     * 특정 단계를 미완료로 표시
     */
    uncompleteStep: (step) =>
        set((state) => {
            const newCompleted = new Set(state.workflow.completedSteps);
            newCompleted.delete(step);

            return {
                workflow: {
                    ...state.workflow,
                    completedSteps: newCompleted,
                },
            };
        }),

    /**
     * 위자드 모드 토글
     */
    toggleWizardMode: () =>
        set((state) => {
            const newIsWizardMode = !state.workflow.isWizardMode;
            let newExpanded = state.workflow.expandedSections;

            if (newIsWizardMode) {
                // 위자드 모드 활성화: 현재 단계만 펼침
                newExpanded = new Set<WorkflowStep>([state.workflow.currentStep]);
            } else {
                // 자유 모드 활성화: 모든 섹션 펼침
                newExpanded = new Set<WorkflowStep>([1, 2, 3, 4, 5, 6, 7]);
            }

            logger.debug(`위자드 모드: ${newIsWizardMode ? '활성화' : '비활성화'}`);

            return {
                workflow: {
                    ...state.workflow,
                    isWizardMode: newIsWizardMode,
                    expandedSections: newExpanded,
                },
            };
        }),

    /**
     * 섹션 펼침/접힘 토글
     */
    toggleSection: (step) =>
        set((state) => {
            const newExpanded = new Set(state.workflow.expandedSections);

            if (newExpanded.has(step)) {
                newExpanded.delete(step);
            } else {
                newExpanded.add(step);
            }

            return {
                workflow: {
                    ...state.workflow,
                    expandedSections: newExpanded,
                },
            };
        }),

    /**
     * 모든 섹션 펼치기
     */
    expandAllSections: () =>
        set((state) => ({
            workflow: {
                ...state.workflow,
                expandedSections: new Set<WorkflowStep>([1, 2, 3, 4, 5, 6, 7]),
            },
        })),

    /**
     * 모든 섹션 접기
     */
    collapseAllSections: () =>
        set((state) => ({
            workflow: {
                ...state.workflow,
                expandedSections: new Set<WorkflowStep>(),
            },
        })),

    /**
     * 워크플로우 상태 초기화
     */
    resetWorkflow: () =>
        set(() => ({
            workflow: createInitialWorkflowState(),
        })),

    /**
     * 워크플로우 상태 복원 (Draft에서 복원 시 사용)
     */
    restoreWorkflowState: (state) => {
        logger.debug(`워크플로우 상태 복원: step=${state.currentStep}, completed=${Array.from(state.completedSteps).join(',')}`);
        set({
            workflow: {
                currentStep: state.currentStep,
                completedSteps: state.completedSteps,
                isWizardMode: state.isWizardMode,
                expandedSections: state.expandedSections,
            },
        });
    },

    /**
     * 특정 단계가 완료되었는지 확인
     */
    isStepCompleted: (step) => {
        return get().workflow.completedSteps.has(step);
    },

    /**
     * 특정 단계에 접근 가능한지 확인
     * (위자드 모드에서는 이전 단계가 완료되어야 접근 가능)
     */
    canAccessStep: (step) => {
        const { workflow } = get();

        // 자유 모드에서는 모든 단계 접근 가능
        if (!workflow.isWizardMode) return true;

        // 첫 번째 단계는 항상 접근 가능
        if (step === 1) return true;

        // 이전 단계가 완료되었거나 현재 단계인 경우 접근 가능
        const prevStep = (step - 1) as WorkflowStep;
        return workflow.completedSteps.has(prevStep) || workflow.currentStep >= step;
    },
}));
