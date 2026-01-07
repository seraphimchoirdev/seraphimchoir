/**
 * Minimal Reassignment Algorithm
 *
 * 긴급 등단 불가 시 최소 변동으로 자리를 재배치합니다.
 * 핵심 전략:
 * 1. "한 줄 당겨앉기" - 같은 행에서 한 칸씩 당김
 * 2. "근처 재배치" - 인접 행/열에서 적합한 멤버 이동
 * 3. "경계 밖 재배치" - 그리드 축소로 밀려난 멤버를 가까운 빈 좌석에 배치
 */

import type { Database } from '@/types/database.types';
import type { SeatAssignment } from '@/store/arrangement-store';
import type { GridLayout } from '@/types/grid';
import {
    type PartZone,
    DEFAULT_PART_ZONES,
    isInPartZone,
    manhattanDistance,
} from './part-zone-analyzer';

type Part = Database['public']['Enums']['part'];

/**
 * 이동 기록
 */
export interface MoveRecord {
    memberId: string;
    memberName: string;
    part: Part;
    from: { row: number; col: number };
    to: { row: number; col: number };
    reason: 'pull_in_row' | 'nearby_reassign' | 'boundary_overflow';
}

/**
 * 재배치 결과
 */
export interface MinimalReassignmentResult {
    /** 새로운 배치 상태 */
    newAssignments: Record<string, SeatAssignment>;
    /** 이동된 멤버 목록 */
    movedMembers: MoveRecord[];
    /** 배치 실패한 멤버 목록 */
    unassignedMembers: Array<{
        memberId: string;
        memberName: string;
        part: Part;
        reason: string;
    }>;
    /** 통계 */
    stats: {
        totalMoved: number;
        sameRowMoves: number;
        nearbyMoves: number;
        overflowMoves: number;
    };
}

/**
 * 멤버 선호도/고정석 정보
 */
export interface MemberSeatPreference {
    memberId: string;
    /** 행 일관성 (0-100%) - 높을수록 특정 행에 자주 앉음 */
    rowConsistency: number;
    /** 열 일관성 (0-100%) - 높을수록 특정 열에 자주 앉음 */
    colConsistency: number;
    /** 선호 행 */
    preferredRow?: number;
    /** 선호 열 */
    preferredCol?: number;
}

/**
 * 이동 우선순위 점수 계산
 * 점수가 낮을수록 이동하기 좋음
 */
function calculateMovePriority(
    assignment: SeatAssignment,
    preferences?: Map<string, MemberSeatPreference>
): number {
    let score = 0;

    // 행장은 이동하지 않는 것이 좋음 (+100)
    if (assignment.isRowLeader) {
        score += 100;
    }

    // 고정석 여부 체크
    const pref = preferences?.get(assignment.memberId);
    if (pref) {
        // 행 고정석: +50
        if (pref.rowConsistency >= 80) {
            score += 50;
        }
        // 열 고정석: +30
        if (pref.colConsistency >= 80) {
            score += 30;
        }
    }

    return score;
}

/**
 * 같은 행에서 한 칸씩 당겨앉기
 *
 * @param assignments - 현재 배치 상태
 * @param emptyPos - 빈 좌석 위치
 * @param partZones - 파트 영역 정의
 * @param rowCapacity - 해당 행의 최대 열 수
 * @param preferences - 멤버별 선호도
 * @returns 이동 결과
 */
export function tryRowPull(
    assignments: Record<string, SeatAssignment>,
    emptyPos: { row: number; col: number },
    partZones: Map<Part, PartZone>,
    rowCapacity: number,
    preferences?: Map<string, MemberSeatPreference>
): {
    newAssignments: Record<string, SeatAssignment>;
    moves: MoveRecord[];
    newEmptyPos: { row: number; col: number } | null;
} {
    const result = { ...assignments };
    const moves: MoveRecord[] = [];
    const { row } = emptyPos;

    // 빈 좌석의 왼쪽과 오른쪽에서 당길 후보 찾기
    // 왼쪽 방향 (col-1, col-2, ...)과 오른쪽 방향 (col+1, col+2, ...) 모두 탐색
    // 파트 영역 검사를 통과하는 후보만 수집
    const candidates: Array<{
        assignment: SeatAssignment;
        key: string;
        direction: 'left' | 'right';
        distance: number;
        priority: number;
    }> = [];

    // 왼쪽 방향 탐색
    for (let c = emptyPos.col - 1; c >= 1; c--) {
        const key = `${row}-${c}`;
        const assignment = result[key];
        if (assignment) {
            // 이동 후 파트 영역 내인지 미리 확인
            const zone = partZones.get(assignment.part) || DEFAULT_PART_ZONES[assignment.part];
            if (isInPartZone(row, emptyPos.col, assignment.part, zone, rowCapacity)) {
                const priority = calculateMovePriority(assignment, preferences);
                candidates.push({
                    assignment,
                    key,
                    direction: 'right', // 왼쪽에 있으니 오른쪽으로 이동
                    distance: emptyPos.col - c,
                    priority,
                });
            }
            break; // 가장 가까운 것만 (파트 영역 검사 결과와 무관하게)
        }
    }

    // 오른쪽 방향 탐색
    for (let c = emptyPos.col + 1; c <= rowCapacity; c++) {
        const key = `${row}-${c}`;
        const assignment = result[key];
        if (assignment) {
            // 이동 후 파트 영역 내인지 미리 확인
            const zone = partZones.get(assignment.part) || DEFAULT_PART_ZONES[assignment.part];
            if (isInPartZone(row, emptyPos.col, assignment.part, zone, rowCapacity)) {
                const priority = calculateMovePriority(assignment, preferences);
                candidates.push({
                    assignment,
                    key,
                    direction: 'left', // 오른쪽에 있으니 왼쪽으로 이동
                    distance: c - emptyPos.col,
                    priority,
                });
            }
            break; // 가장 가까운 것만 (파트 영역 검사 결과와 무관하게)
        }
    }

    if (candidates.length === 0) {
        return { newAssignments: result, moves, newEmptyPos: emptyPos };
    }

    // 우선순위가 낮고 거리가 가까운 후보 선택
    candidates.sort((a, b) => {
        // 우선순위 먼저 (낮을수록 이동하기 좋음)
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        // 같으면 거리 짧은 것
        return a.distance - b.distance;
    });

    const selected = candidates[0];

    // 이동 실행
    const newKey = `${row}-${emptyPos.col}`;
    const oldKey = selected.key;

    result[newKey] = {
        ...selected.assignment,
        row,
        col: emptyPos.col,
    };
    delete result[oldKey];

    moves.push({
        memberId: selected.assignment.memberId,
        memberName: selected.assignment.memberName,
        part: selected.assignment.part,
        from: { row: selected.assignment.row, col: selected.assignment.col },
        to: { row, col: emptyPos.col },
        reason: 'pull_in_row',
    });

    // 새로운 빈 좌석 위치 반환
    const newEmptyPos = { row, col: selected.assignment.col };

    return { newAssignments: result, moves, newEmptyPos };
}

/**
 * 경계 밖 멤버를 가장 가까운 빈 좌석에 재배치
 */
function reassignOverflowMember(
    member: SeatAssignment,
    assignments: Record<string, SeatAssignment>,
    gridLayout: GridLayout,
    partZones: Map<Part, PartZone>
): {
    newAssignments: Record<string, SeatAssignment>;
    move: MoveRecord | null;
    failed: { memberId: string; memberName: string; part: Part; reason: string } | null;
} {
    const { rowCapacities } = gridLayout;
    const zone = partZones.get(member.part) || DEFAULT_PART_ZONES[member.part];

    // 모든 빈 좌석 찾기
    const emptySeats: Array<{ row: number; col: number; distance: number }> = [];

    for (let r = 1; r <= rowCapacities.length; r++) {
        const maxCol = rowCapacities[r - 1] || 0;
        for (let c = 1; c <= maxCol; c++) {
            const key = `${r}-${c}`;
            if (!assignments[key]) {
                // 파트 영역 내인지 확인
                if (isInPartZone(r, c, member.part, zone, maxCol)) {
                    const distance = manhattanDistance(
                        { row: member.row, col: member.col },
                        { row: r, col: c }
                    );
                    emptySeats.push({ row: r, col: c, distance });
                }
            }
        }
    }

    if (emptySeats.length === 0) {
        return {
            newAssignments: assignments,
            move: null,
            failed: {
                memberId: member.memberId,
                memberName: member.memberName,
                part: member.part,
                reason: `파트 영역 내 빈 좌석 없음`,
            },
        };
    }

    // 가장 가까운 빈 좌석 선택
    emptySeats.sort((a, b) => a.distance - b.distance);
    const target = emptySeats[0];

    const result = { ...assignments };
    const newKey = `${target.row}-${target.col}`;

    result[newKey] = {
        ...member,
        row: target.row,
        col: target.col,
    };

    return {
        newAssignments: result,
        move: {
            memberId: member.memberId,
            memberName: member.memberName,
            part: member.part,
            from: { row: member.row, col: member.col },
            to: { row: target.row, col: target.col },
            reason: 'boundary_overflow',
        },
        failed: null,
    };
}

/**
 * 최소 변동 재배치 알고리즘
 *
 * @param currentAssignments - 현재 배치 상태
 * @param removedPosition - 제거된 좌석 위치
 * @param newGridLayout - 새 그리드 레이아웃
 * @param partZones - 파트 영역 정의
 * @param preferences - 멤버별 선호도 (선택)
 * @returns 재배치 결과
 */
export function minimalReassignment(
    currentAssignments: Record<string, SeatAssignment>,
    removedPosition: { row: number; col: number },
    newGridLayout: GridLayout,
    partZones: Map<Part, PartZone>,
    preferences?: Map<string, MemberSeatPreference>
): MinimalReassignmentResult {
    const { rowCapacities } = newGridLayout;
    let assignments = { ...currentAssignments };
    const allMoves: MoveRecord[] = [];
    const unassigned: Array<{
        memberId: string;
        memberName: string;
        part: Part;
        reason: string;
    }> = [];

    // 1단계: 경계 내/외 멤버 분리
    const inBounds: Record<string, SeatAssignment> = {};
    const outOfBounds: SeatAssignment[] = [];

    Object.values(assignments).forEach((assignment) => {
        const { row, col } = assignment;
        const rowIndex = row - 1;
        const maxColInRow = rowCapacities[rowIndex] || 0;

        if (rowIndex >= 0 && rowIndex < rowCapacities.length && col <= maxColInRow) {
            inBounds[`${row}-${col}`] = assignment;
        } else {
            outOfBounds.push(assignment);
        }
    });

    assignments = inBounds;

    // 2단계: 빈 좌석에서 "한 줄 당겨앉기" 시도
    // 제거된 위치가 경계 내에 있는 경우만 당기기 시도
    const removedRowIndex = removedPosition.row - 1;
    const maxColInRemovedRow = rowCapacities[removedRowIndex] || 0;

    if (
        removedRowIndex >= 0 &&
        removedRowIndex < rowCapacities.length &&
        removedPosition.col <= maxColInRemovedRow
    ) {
        // 빈 좌석이 있으면 당기기 시도
        const emptyKey = `${removedPosition.row}-${removedPosition.col}`;
        if (!assignments[emptyKey]) {
            const pullResult = tryRowPull(
                assignments,
                removedPosition,
                partZones,
                maxColInRemovedRow,
                preferences
            );
            assignments = pullResult.newAssignments;
            allMoves.push(...pullResult.moves);

            // 당긴 후 새 빈 좌석에서 추가로 당기기 시도 (연쇄)
            // 최대 3번까지만 시도 (무한 루프 방지)
            let currentEmpty = pullResult.newEmptyPos;
            let chainCount = 0;

            while (currentEmpty && chainCount < 3) {
                const chainKey = `${currentEmpty.row}-${currentEmpty.col}`;
                if (assignments[chainKey]) {
                    break; // 이미 채워짐
                }

                const chainPull = tryRowPull(
                    assignments,
                    currentEmpty,
                    partZones,
                    rowCapacities[currentEmpty.row - 1] || 0,
                    preferences
                );

                if (chainPull.moves.length === 0) {
                    break; // 더 이상 당길 사람 없음
                }

                assignments = chainPull.newAssignments;
                allMoves.push(...chainPull.moves);
                currentEmpty = chainPull.newEmptyPos;
                chainCount++;
            }
        }
    }

    // 3단계: 경계 밖 멤버 재배치
    for (const overflow of outOfBounds) {
        const result = reassignOverflowMember(
            overflow,
            assignments,
            newGridLayout,
            partZones
        );
        assignments = result.newAssignments;

        if (result.move) {
            allMoves.push(result.move);
        }
        if (result.failed) {
            unassigned.push(result.failed);
        }
    }

    // 통계 계산
    const stats = {
        totalMoved: allMoves.length,
        sameRowMoves: allMoves.filter((m) => m.reason === 'pull_in_row').length,
        nearbyMoves: allMoves.filter((m) => m.reason === 'nearby_reassign').length,
        overflowMoves: allMoves.filter((m) => m.reason === 'boundary_overflow').length,
    };

    return {
        newAssignments: assignments,
        movedMembers: allMoves,
        unassignedMembers: unassigned,
        stats,
    };
}

/**
 * 빠른 버전: 그리드 축소만 적용하고 당기기는 하지 않음
 * (기존 setGridLayoutAndCompact와 동일한 동작)
 */
export function applyGridBoundsOnly(
    currentAssignments: Record<string, SeatAssignment>,
    newGridLayout: GridLayout
): {
    newAssignments: Record<string, SeatAssignment>;
    orphanedMembers: SeatAssignment[];
} {
    const { rowCapacities } = newGridLayout;
    const newAssignments: Record<string, SeatAssignment> = {};
    const orphanedMembers: SeatAssignment[] = [];

    Object.values(currentAssignments).forEach((assignment) => {
        const { row, col } = assignment;
        const rowIndex = row - 1;
        const maxColInRow = rowCapacities[rowIndex] || 0;

        if (rowIndex >= 0 && rowIndex < rowCapacities.length && col <= maxColInRow) {
            newAssignments[`${row}-${col}`] = assignment;
        } else {
            orphanedMembers.push(assignment);
        }
    });

    return { newAssignments, orphanedMembers };
}
