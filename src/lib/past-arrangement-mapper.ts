/**
 * 과거 자리배치 파트별 영역 매핑 모듈
 *
 * 과거 배치를 현재 그리드에 적용할 때 파트별 영역(zone)을 유지합니다.
 * - 각 파트가 과거에 차지한 영역을 분석
 * - 현재 그리드에 비례적으로 매핑
 * - 학습된 규칙 또는 기본 규칙 기반으로 타겟 영역 계산
 */

import type { PartPlacementRule, ColRange } from './part-placement-rules-loader';

type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';

// ============================================================================
// 열 범위 검증 함수 (Phase 4)
// ============================================================================

/**
 * 그리드 크기에 맞춰 열 범위를 비율적으로 조정
 *
 * 기본 열 범위는 15열 기준이므로, 다른 그리드 크기에 맞춰 비율 조정
 *
 * @param colRange - 기본 열 범위 (15열 기준)
 * @param maxColInRow - 해당 행의 실제 열 수
 * @param baseMaxCol - 기준 열 수 (기본: 15)
 */
function adjustColRangeForGrid(
    colRange: ColRange,
    maxColInRow: number,
    baseMaxCol: number = 15
): { min: number; max: number } {
    const ratio = maxColInRow / baseMaxCol;
    return {
        min: Math.max(1, Math.round(colRange.min * ratio)),
        max: Math.min(maxColInRow, Math.round(colRange.max * ratio)),
    };
}

/**
 * 좌석이 파트의 허용 열 범위 내에 있는지 확인
 *
 * @param row - 행 번호 (1-based)
 * @param col - 열 번호 (1-based)
 * @param colRangeByRow - 파트의 행별 열 범위
 * @param maxColInRow - 해당 행의 최대 열 수
 */
function isInAllowedColRange(
    row: number,
    col: number,
    colRangeByRow?: Record<number, ColRange>,
    maxColInRow?: number
): boolean {
    // 열 범위 정보가 없으면 항상 허용
    if (!colRangeByRow || !colRangeByRow[row]) {
        return true;
    }

    const baseRange = colRangeByRow[row];

    // 그리드 크기에 따른 비율 조정
    if (maxColInRow && maxColInRow !== 15) {
        const adjustedRange = adjustColRangeForGrid(baseRange, maxColInRow);
        return col >= adjustedRange.min && col <= adjustedRange.max;
    }

    return col >= baseRange.min && col <= baseRange.max;
}

/** 파트별 배치 규칙 타입 */
export type PartPlacementRules = Record<Part, PartPlacementRule>;

/** 기본 파트별 배치 규칙 (학습 데이터 없을 때 사용) - 1-based row index */
const DEFAULT_PART_PLACEMENT_RULES: PartPlacementRules = {
    SOPRANO: { side: 'left', preferredRows: [1, 2, 3], overflowRows: [4, 5, 6] },
    ALTO: { side: 'right', preferredRows: [1, 2, 3], overflowRows: [4], forbiddenRows: [5, 6] },
    TENOR: { side: 'left', preferredRows: [4, 5, 6], overflowRows: [] },
    BASS: { side: 'right', preferredRows: [4, 5, 6], overflowRows: [] },
    SPECIAL: { side: 'left', preferredRows: [1, 2, 3, 4, 5, 6], overflowRows: [] },
};

/** 그리드 레이아웃 */
export interface GridLayout {
    rows: number;
    rowCapacities: number[];
    zigzagPattern: 'none' | 'even' | 'odd';
}

/** 과거 좌석 정보 */
export interface PastSeat {
    memberId: string;
    memberName: string;
    part: Part;
    row: number;  // 1-based
    col: number;  // 1-based
}

/** 현재 출석 가능한 멤버 */
export interface AvailableMember {
    id: string;
    name: string;
    part: Part;
}

/** 배치 결과 좌석 */
export interface SeatRecommendation {
    memberId: string;
    memberName: string;
    row: number;
    col: number;
    part: Part;
}

/** 미배치 멤버 */
export interface UnassignedMember {
    id: string;
    name: string;
    part: Part;
    reason: 'not_in_past' | 'out_of_grid' | 'seat_conflict' | 'zone_full';
}

/** ML 기반 멤버별 선호 좌석 정보 */
export interface MemberSeatPreference {
    preferred_row: number;       // 가장 많이 앉은 행 (1-based)
    preferred_col: number;       // 평균 열 위치 (1-based)
    is_fixed_seat: boolean;      // 고정석 여부 (row/col 일관성 둘 다 ≥90%)
    row_consistency: number;     // 행 일관성 (0-100)
    col_consistency: number;     // 열 일관성 (0-100)
}

/** 파트별 타겟 영역 */
interface PartZoneTarget {
    part: Part;
    rows: number[];           // 사용 가능한 행 목록 (1-based)
    colStart: number;         // 열 시작 (1-based)
    colEnd: number;           // 열 끝 (1-based, exclusive)
    preferredRows: number[];  // 선호 행 (1-based)
    overflowRows: number[];   // 오버플로우 행 (1-based)
    // 열 범위 관련 필드 (Phase 4 추가)
    colRangeByRow?: Record<number, ColRange>;  // 행별 열 범위
}

/**
 * 현재 그리드에서 각 파트의 타겟 영역 계산
 *
 * @param gridLayout - 현재 그리드 레이아웃
 * @param learnedRules - 학습된 규칙 (선택적, 없으면 기본값 사용)
 */
function calculatePartZones(
    gridLayout: GridLayout,
    learnedRules?: PartPlacementRules
): Map<Part, PartZoneTarget> {
    const zones = new Map<Part, PartZoneTarget>();
    const { rows, rowCapacities } = gridLayout;

    // 사용할 규칙 결정 (학습 규칙 우선)
    const rules = learnedRules || DEFAULT_PART_PLACEMENT_RULES;

    // 행별 최대 열 계산
    const maxCols = Math.max(...rowCapacities);

    // 중앙 기준점 (좌/우 분할) - 1-based
    const midCol = Math.floor(maxCols / 2) + 1;

    // 각 파트별 영역 계산
    for (const [partName, partRules] of Object.entries(rules)) {
        const part = partName as Part;

        // 열 범위 (1-based): 좌측 파트는 1 ~ midCol, 우측 파트는 midCol ~ maxCols
        // 'both' 측면인 경우 전체 열 사용
        const colStart = partRules.side === 'left' ? 1 : (partRules.side === 'right' ? midCol : 1);
        const colEnd = partRules.side === 'left' ? midCol : maxCols + 1;

        // 선호 행 (그리드 범위 내, 1-based이므로 rows 이하인지 확인)
        const preferredRows = partRules.preferredRows.filter(r => r <= rows);

        // 오버플로우 행 (그리드 범위 내)
        const overflowRows = partRules.overflowRows.filter(r => r <= rows);

        // 금지 행 제외 (학습된 규칙에서 가져옴)
        const forbiddenRows = partRules.forbiddenRows || [];

        // 사용 가능한 모든 행 (금지 행 제외)
        const allRows = [...new Set([...preferredRows, ...overflowRows])]
            .filter(r => !forbiddenRows.includes(r))
            .sort((a, b) => a - b);

        zones.set(part, {
            part,
            rows: allRows,
            colStart,
            colEnd,
            preferredRows: preferredRows.filter(r => !forbiddenRows.includes(r)),
            overflowRows: overflowRows.filter(r => !forbiddenRows.includes(r)),
            // 열 범위 정보 포함 (Phase 4)
            colRangeByRow: partRules.colRangeByRow,
        });
    }

    return zones;
}

/**
 * 영역 내 사용 가능한 좌석 목록 생성
 *
 * 우선순위 (Phase 4 열 범위 적용):
 * 1. 선호 행 + 열 범위 내 (priority: 0)
 * 2. 선호 행 + 열 범위 외 (priority: 1)
 * 3. 오버플로우 행 + 열 범위 내 (priority: 2)
 * 4. 오버플로우 행 + 열 범위 외 (priority: 3)
 */
function getAvailableSeatsInZone(
    zone: PartZoneTarget,
    gridLayout: GridLayout,
    occupiedSeats: Set<string>
): { row: number; col: number }[] {
    const seats: { row: number; col: number; priority: number }[] = [];

    // 선호 행 먼저, 그 다음 오버플로우 행 (모두 1-based)
    // 기본 행 우선순위: 선호=0, 오버플로우=2
    const orderedRows = [
        ...zone.preferredRows.map(r => ({ row: r, basePriority: 0 })),
        ...zone.overflowRows.map(r => ({ row: r, basePriority: 2 })),
    ];

    for (const { row, basePriority } of orderedRows) {
        // 1-based row를 0-based index로 변환하여 배열 접근
        const rowCapacity = gridLayout.rowCapacities[row - 1] || 0;

        // 해당 행에서 영역 내 열만 사용 (1-based)
        const colStart = Math.max(1, zone.colStart);
        const colEnd = Math.min(rowCapacity + 1, zone.colEnd);

        for (let col = colStart; col < colEnd; col++) {
            const seatKey = `${row}-${col}`;
            if (!occupiedSeats.has(seatKey)) {
                // 열 범위 검증으로 추가 우선순위 결정
                // 열 범위 내: +0, 열 범위 외: +1
                const inColRange = isInAllowedColRange(
                    row,
                    col,
                    zone.colRangeByRow,
                    rowCapacity
                );
                const colPriorityBonus = inColRange ? 0 : 1;

                seats.push({
                    row,
                    col,
                    priority: basePriority + colPriorityBonus,
                });
            }
        }
    }

    // 우선순위별 정렬 (열 범위 내 선호 행 먼저)
    seats.sort((a, b) => a.priority - b.priority);

    return seats.map(s => ({ row: s.row, col: s.col }));
}

/**
 * 과거 배치에서 멤버의 상대적 위치 계산
 * 해당 파트 영역 내에서의 상대적 위치 (0-1)
 */
function calculateRelativePosition(
    seat: PastSeat,
    partSeats: PastSeat[],
    pastGridLayout: GridLayout
): { relativeRow: number; relativeCol: number } {
    // 파트 내 행 범위
    const partRows = partSeats.map(s => s.row);
    const minRow = Math.min(...partRows);
    const maxRow = Math.max(...partRows);
    const rowRange = maxRow - minRow || 1;

    // 파트 내 열 범위
    const partCols = partSeats.map(s => s.col);
    const minCol = Math.min(...partCols);
    const maxCol = Math.max(...partCols);
    const colRange = maxCol - minCol || 1;

    return {
        relativeRow: (seat.row - minRow) / rowRange,
        relativeCol: (seat.col - minCol) / colRange,
    };
}

/**
 * 상대적 위치에 가장 가까운 좌석 찾기
 */
function findClosestSeat(
    relativePos: { relativeRow: number; relativeCol: number },
    availableSeats: { row: number; col: number }[],
    zone: PartZoneTarget,
    gridLayout: GridLayout
): { row: number; col: number } | null {
    if (availableSeats.length === 0) return null;
    if (availableSeats.length === 1) return availableSeats[0];

    // 영역 범위 계산
    const rowRange = Math.max(...zone.rows) - Math.min(...zone.rows) || 1;
    const colRange = zone.colEnd - zone.colStart || 1;

    // 타겟 절대 좌표 계산
    const targetRow = Math.min(...zone.rows) + relativePos.relativeRow * rowRange;
    const targetCol = zone.colStart + relativePos.relativeCol * colRange;

    // 가장 가까운 좌석 찾기
    let closest = availableSeats[0];
    let minDistance = Infinity;

    for (const seat of availableSeats) {
        const distance = Math.sqrt(
            Math.pow(seat.row - targetRow, 2) +
            Math.pow(seat.col - targetCol, 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            closest = seat;
        }
    }

    return closest;
}

/**
 * ML 선호 좌석을 고려한 최적 좌석 탐색
 *
 * 우선순위:
 * 1. 선호 좌석이 비어있으면 즉시 반환
 * 2. 선호 좌석과 동일 행 내 빈 좌석 탐색 (열 거리 가까운 순)
 * 3. 기존 상대적 위치 기반 거리 계산 (fallback)
 */
function findBestSeat(
    availableSeats: { row: number; col: number }[],
    relativePos: { relativeRow: number; relativeCol: number },
    zone: PartZoneTarget,
    gridLayout: GridLayout,
    memberPreference?: MemberSeatPreference
): { row: number; col: number } | null {
    if (availableSeats.length === 0) return null;

    // ML 선호 좌석이 있는 경우
    if (memberPreference) {
        // 1단계: 선호 좌석이 사용 가능한가?
        const preferredSeat = availableSeats.find(
            s => s.row === memberPreference.preferred_row &&
                 s.col === memberPreference.preferred_col
        );
        if (preferredSeat) {
            return preferredSeat;
        }

        // 2단계: 선호 좌석과 동일 행 내 검색 (열 거리 가까운 순)
        const sameRowSeats = availableSeats
            .filter(s => s.row === memberPreference.preferred_row)
            .sort((a, b) =>
                Math.abs(a.col - memberPreference.preferred_col) -
                Math.abs(b.col - memberPreference.preferred_col)
            );

        if (sameRowSeats.length > 0) {
            return sameRowSeats[0]; // 열 거리가 가장 가까운 좌석
        }
    }

    // 3단계: 기존 로직 (상대적 위치 기반 거리 계산)
    return findClosestSeat(relativePos, availableSeats, zone, gridLayout);
}

/**
 * 과거 배치를 현재 그리드에 파트별 영역 유지하며 매핑
 * ML 선호 좌석 데이터를 활용하여 멤버별 익숙한 위치에 배치
 *
 * @param params.learnedRules - 학습된 파트 배치 규칙 (선택적, 없으면 기본값 사용)
 */
export function applyPastArrangementWithZoneMapping(params: {
    pastSeats: PastSeat[];
    pastGridLayout: GridLayout;
    currentGridLayout: GridLayout;
    availableMembers: AvailableMember[];
    memberPreferences?: Map<string, MemberSeatPreference>;  // ML 선호 좌석 데이터
    learnedRules?: PartPlacementRules;  // 학습된 파트 배치 규칙
}): {
    seats: SeatRecommendation[];
    unassignedMembers: UnassignedMember[];
} {
    const { pastSeats, pastGridLayout, currentGridLayout, availableMembers, memberPreferences, learnedRules } = params;

    const seats: SeatRecommendation[] = [];
    const unassignedMembers: UnassignedMember[] = [];
    const occupiedSeats = new Set<string>();
    const assignedMemberIds = new Set<string>();

    // 출석 가능 멤버 ID Set 및 Map
    const availableMemberIds = new Set(availableMembers.map(m => m.id));
    const availableMemberMap = new Map(availableMembers.map(m => [m.id, m]));

    // 현재 그리드의 파트별 타겟 영역 계산 (학습된 규칙 적용)
    const partZones = calculatePartZones(currentGridLayout, learnedRules);

    // 파트별로 과거 좌석 그룹화 (출석 가능한 멤버만)
    const pastSeatsByPart = new Map<Part, PastSeat[]>();
    for (const seat of pastSeats) {
        if (!availableMemberIds.has(seat.memberId)) continue;

        if (!pastSeatsByPart.has(seat.part)) {
            pastSeatsByPart.set(seat.part, []);
        }
        pastSeatsByPart.get(seat.part)!.push(seat);
    }

    // 파트 순서대로 처리 (S, A, T, B, SPECIAL)
    const partOrder: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];

    for (const part of partOrder) {
        const zone = partZones.get(part);
        if (!zone) continue;

        const partPastSeats = pastSeatsByPart.get(part) || [];

        // 1단계: 과거 배치에 있던 멤버 배치
        for (const pastSeat of partPastSeats) {
            const availableSeats = getAvailableSeatsInZone(zone, currentGridLayout, occupiedSeats);

            if (availableSeats.length === 0) {
                // 영역이 가득 찬 경우
                unassignedMembers.push({
                    id: pastSeat.memberId,
                    name: pastSeat.memberName,
                    part: pastSeat.part,
                    reason: 'zone_full',
                });
                assignedMemberIds.add(pastSeat.memberId);
                continue;
            }

            // 1순위: 과거와 동일 좌표에 배치 시도
            const sameCoord = availableSeats.find(
                s => s.row === pastSeat.row && s.col === pastSeat.col
            );

            let bestSeat: { row: number; col: number } | null = null;

            if (sameCoord) {
                // 과거와 동일 좌표 사용 가능
                bestSeat = sameCoord;
            } else {
                // 2순위 이하: ML 선호 좌석 → 동일 행 탐색 → 상대적 위치 기반
                const relativePos = calculateRelativePosition(pastSeat, partPastSeats, pastGridLayout);
                const pref = memberPreferences?.get(pastSeat.memberId);
                bestSeat = findBestSeat(availableSeats, relativePos, zone, currentGridLayout, pref);
            }

            if (bestSeat) {
                seats.push({
                    memberId: pastSeat.memberId,
                    memberName: pastSeat.memberName,
                    row: bestSeat.row,
                    col: bestSeat.col,
                    part: pastSeat.part,
                });
                occupiedSeats.add(`${bestSeat.row}-${bestSeat.col}`);
                assignedMemberIds.add(pastSeat.memberId);
            }
        }

        // 2단계: 해당 파트의 신규 멤버 (과거 배치에 없던) 배치
        // 고정석 멤버 우선, 일관성 높은 멤버 우선 정렬
        const newMembersOfPart = availableMembers
            .filter(m => m.part === part && !assignedMemberIds.has(m.id))
            .sort((a, b) => {
                const aPref = memberPreferences?.get(a.id);
                const bPref = memberPreferences?.get(b.id);

                // 고정석 멤버 우선
                if (aPref?.is_fixed_seat && !bPref?.is_fixed_seat) return -1;
                if (!aPref?.is_fixed_seat && bPref?.is_fixed_seat) return 1;

                // 일관성 높은 멤버 우선
                const aScore = (aPref?.row_consistency || 0) + (aPref?.col_consistency || 0);
                const bScore = (bPref?.row_consistency || 0) + (bPref?.col_consistency || 0);
                return bScore - aScore;
            });

        for (const member of newMembersOfPart) {
            const availableSeats = getAvailableSeatsInZone(zone, currentGridLayout, occupiedSeats);

            if (availableSeats.length === 0) {
                unassignedMembers.push({
                    id: member.id,
                    name: member.name,
                    part: member.part,
                    reason: 'zone_full',
                });
                assignedMemberIds.add(member.id);
                continue;
            }

            // ML 선호 좌석 기반 배치 (선호 좌석 → 동일 행 → 첫 번째 빈 좌석)
            const pref = memberPreferences?.get(member.id);
            let seat: { row: number; col: number } | null = null;

            if (pref) {
                // 선호 좌석 또는 동일 행 탐색
                seat = findBestSeat(
                    availableSeats,
                    { relativeRow: 0, relativeCol: 0 },  // 신규 멤버는 상대 위치 없음
                    zone,
                    currentGridLayout,
                    pref
                );
            }

            // fallback: 첫 번째 빈 좌석
            seat = seat || availableSeats[0];

            seats.push({
                memberId: member.id,
                memberName: member.name,
                row: seat.row,
                col: seat.col,
                part: member.part,
            });
            occupiedSeats.add(`${seat.row}-${seat.col}`);
            assignedMemberIds.add(member.id);
        }
    }

    // 미배치된 멤버 처리 (예: 알 수 없는 파트)
    for (const member of availableMembers) {
        if (!assignedMemberIds.has(member.id)) {
            unassignedMembers.push({
                id: member.id,
                name: member.name,
                part: member.part,
                reason: 'not_in_past',
            });
        }
    }

    return { seats, unassignedMembers };
}
