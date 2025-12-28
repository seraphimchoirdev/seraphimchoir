/**
 * 과거 자리배치 파트별 영역 매핑 모듈
 *
 * 과거 배치를 현재 그리드에 적용할 때 파트별 영역(zone)을 유지합니다.
 * - 각 파트가 과거에 차지한 영역을 분석
 * - 현재 그리드에 비례적으로 매핑
 * - PART_PLACEMENT_RULES 기반으로 타겟 영역 계산
 */

type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';

/** 파트별 배치 규칙 (ai-seat-algorithm.ts에서 가져온 규칙) */
const PART_PLACEMENT_RULES = {
    SOPRANO: { side: 'left' as const, preferredRows: [0, 1, 2], overflowRows: [3, 4, 5] },
    ALTO: { side: 'right' as const, preferredRows: [0, 1, 2], overflowRows: [3] }, // 4, 5행 (0-based) 금지!
    TENOR: { side: 'left' as const, preferredRows: [3, 4, 5], overflowRows: [] },
    BASS: { side: 'right' as const, preferredRows: [3, 4, 5], overflowRows: [] },
    SPECIAL: { side: 'left' as const, preferredRows: [0, 1, 2, 3, 4, 5], overflowRows: [] },
} as const;

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
    row: number;  // 0-based
    col: number;  // 0-based
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

/** 파트별 타겟 영역 */
interface PartZoneTarget {
    part: Part;
    rows: number[];           // 사용 가능한 행 목록 (0-based)
    colStart: number;         // 열 시작 (0-based)
    colEnd: number;           // 열 끝 (0-based, exclusive)
    preferredRows: number[];  // 선호 행
    overflowRows: number[];   // 오버플로우 행
}

/**
 * 현재 그리드에서 각 파트의 타겟 영역 계산
 */
function calculatePartZones(gridLayout: GridLayout): Map<Part, PartZoneTarget> {
    const zones = new Map<Part, PartZoneTarget>();
    const { rows, rowCapacities } = gridLayout;

    // 행별 최대 열 계산
    const maxCols = Math.max(...rowCapacities);

    // 중앙 기준점 (좌/우 분할)
    const midCol = Math.floor(maxCols / 2);

    // 각 파트별 영역 계산
    for (const [partName, rules] of Object.entries(PART_PLACEMENT_RULES)) {
        const part = partName as Part;

        // 열 범위: 좌측 파트는 0 ~ midCol, 우측 파트는 midCol ~ maxCols
        const colStart = rules.side === 'left' ? 0 : midCol;
        const colEnd = rules.side === 'left' ? midCol : maxCols;

        // 선호 행 (그리드 범위 내)
        const preferredRows = rules.preferredRows.filter(r => r < rows);

        // 오버플로우 행 (그리드 범위 내)
        const overflowRows = rules.overflowRows.filter(r => r < rows);

        // 사용 가능한 모든 행
        const allRows = [...new Set([...preferredRows, ...overflowRows])].sort((a, b) => a - b);

        zones.set(part, {
            part,
            rows: allRows,
            colStart,
            colEnd,
            preferredRows,
            overflowRows,
        });
    }

    return zones;
}

/**
 * 영역 내 사용 가능한 좌석 목록 생성
 */
function getAvailableSeatsInZone(
    zone: PartZoneTarget,
    gridLayout: GridLayout,
    occupiedSeats: Set<string>
): { row: number; col: number }[] {
    const seats: { row: number; col: number; priority: number }[] = [];

    // 선호 행 먼저, 그 다음 오버플로우 행
    const orderedRows = [
        ...zone.preferredRows.map(r => ({ row: r, priority: 0 })),
        ...zone.overflowRows.map(r => ({ row: r, priority: 1 })),
    ];

    for (const { row, priority } of orderedRows) {
        const rowCapacity = gridLayout.rowCapacities[row] || 0;

        // 해당 행에서 영역 내 열만 사용
        const colStart = Math.max(0, zone.colStart);
        const colEnd = Math.min(rowCapacity, zone.colEnd);

        for (let col = colStart; col < colEnd; col++) {
            const seatKey = `${row}-${col}`;
            if (!occupiedSeats.has(seatKey)) {
                seats.push({ row, col, priority });
            }
        }
    }

    // 우선순위별 정렬 (선호 행 먼저)
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
 * 과거 배치를 현재 그리드에 파트별 영역 유지하며 매핑
 */
export function applyPastArrangementWithZoneMapping(params: {
    pastSeats: PastSeat[];
    pastGridLayout: GridLayout;
    currentGridLayout: GridLayout;
    availableMembers: AvailableMember[];
}): {
    seats: SeatRecommendation[];
    unassignedMembers: UnassignedMember[];
} {
    const { pastSeats, pastGridLayout, currentGridLayout, availableMembers } = params;

    const seats: SeatRecommendation[] = [];
    const unassignedMembers: UnassignedMember[] = [];
    const occupiedSeats = new Set<string>();
    const assignedMemberIds = new Set<string>();

    // 출석 가능 멤버 ID Set 및 Map
    const availableMemberIds = new Set(availableMembers.map(m => m.id));
    const availableMemberMap = new Map(availableMembers.map(m => [m.id, m]));

    // 현재 그리드의 파트별 타겟 영역 계산
    const partZones = calculatePartZones(currentGridLayout);

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

            // 상대적 위치 계산
            const relativePos = calculateRelativePosition(pastSeat, partPastSeats, pastGridLayout);

            // 가장 가까운 좌석 찾기
            const bestSeat = findClosestSeat(relativePos, availableSeats, zone, currentGridLayout);

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
        const newMembersOfPart = availableMembers.filter(
            m => m.part === part && !assignedMemberIds.has(m.id)
        );

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

            // 신규 멤버는 남은 좌석 중 첫 번째에 배치 (선호 행 우선)
            const seat = availableSeats[0];
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
