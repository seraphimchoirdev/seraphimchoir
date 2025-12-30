
import { create } from 'zustand';
import type { Database } from '@/types/database.types';
import type { GridLayout } from '@/types/grid';

type Part = Database['public']['Enums']['part'];

export interface SeatAssignment {
    memberId: string;
    memberName: string;
    part: Part;
    row: number;
    col: number;
    isRowLeader?: boolean;
}

interface ArrangementState {
    // Key format: "row-col" (e.g., "0-1")
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

    // Actions
    setAssignments: (assignments: SeatAssignment[]) => void;
    setGridLayout: (layout: GridLayout | null) => void;
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

    setAssignments: (assignmentsList) => {
        const newAssignments: Record<string, SeatAssignment> = {};
        assignmentsList.forEach((a) => {
            newAssignments[`${a.row}-${a.col}`] = a;
        });
        set({ assignments: newAssignments });
    },

    setGridLayout: (layout) => set({ gridLayout: layout }),

    placeMember: (member, row, col) =>
        set((state) => {
            const key = `${row}-${col}`;
            // If seat is occupied, we overwrite it (or could swap, but overwrite is simpler for now)
            return {
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
            return { assignments: rest };
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

            return { assignments: newAssignments };
        }),

    clearArrangement: () => set({ assignments: {}, gridLayout: null }),

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
                assignments: {
                    ...state.assignments,
                    [key]: {
                        ...assignment,
                        isRowLeader: !assignment.isRowLeader,
                    },
                },
            };
        }),
}));
