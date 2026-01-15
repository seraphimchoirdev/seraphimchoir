
import { create } from 'zustand';
import type { Database } from '@/types/database.types';
import type { GridLayout } from '@/types/grid';
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

    // Actions
    setAssignments: (assignments: SeatAssignment[]) => void;
    setGridLayout: (layout: GridLayout | null) => void;
    setGridLayoutAndCompact: (layout: GridLayout) => void;
    placeMember: (member: Omit<SeatAssignment, 'row' | 'col'>, row: number, col: number) => void;
    removeMember: (row: number, col: number) => void;
    moveMember: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
    clearArrangement: () => void;

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
            const { [key]: removed, ...rest } = state.assignments;
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
                // Occupied seat → swap (sidebar member doesn't have a position yet, so just place)
                // Actually, for sidebar → grid, we should just overwrite
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
}));
