/**
 * Part Zone Analyzer
 *
 * DB의 과거 배치 데이터를 분석하여 각 파트의 영역 통계를 생성합니다.
 * 이 데이터는 긴급 재배치 시 파트 경계를 유지하는 데 사용됩니다.
 */

import type { Database } from '@/types/database.types';

type Part = Database['public']['Enums']['part'];

/**
 * 파트별 영역 통계
 */
export interface PartZoneStatistics {
    part: Part;
    /** 행별 좌석 분포 (row -> count) */
    rowDistribution: Record<number, number>;
    /** 열별 좌석 분포 (col -> count) */
    colDistribution: Record<number, number>;
    /** 평균 행 위치 */
    avgRow: number;
    /** 평균 열 위치 */
    avgCol: number;
    /** 총 좌석 수 */
    totalSeats: number;
    /** 최소 행 */
    minRow: number;
    /** 최대 행 */
    maxRow: number;
    /** 최소 열 */
    minCol: number;
    /** 최대 열 */
    maxCol: number;
}

/**
 * 파트 영역 정의 (재배치 시 사용)
 */
export interface PartZone {
    part: Part;
    /** 허용 행 범위 [min, max] (1-based) */
    allowedRows: [number, number];
    /** 선호 측면 ('left' | 'right' | 'both') */
    side: 'left' | 'right' | 'both';
    /** 금지 행 목록 */
    forbiddenRows: number[];
    /** 우선순위 행 목록 (가까울수록 우선) */
    preferredRows: number[];
}

/**
 * 기본 파트 배치 규칙 (DB 데이터 없을 때 사용)
 */
export const DEFAULT_PART_ZONES: Record<Part, PartZone> = {
    SOPRANO: {
        part: 'SOPRANO',
        allowedRows: [1, 6],
        side: 'left',
        forbiddenRows: [],
        preferredRows: [1, 2, 3, 4, 5, 6],
    },
    ALTO: {
        part: 'ALTO',
        allowedRows: [1, 4], // 5-6행 금지!
        side: 'right',
        forbiddenRows: [5, 6],
        preferredRows: [1, 2, 3, 4],
    },
    TENOR: {
        part: 'TENOR',
        allowedRows: [1, 6],
        side: 'left',
        forbiddenRows: [],
        preferredRows: [4, 5, 6, 3, 2, 1],
    },
    BASS: {
        part: 'BASS',
        allowedRows: [4, 6], // 4-6행 우선 (3행 이하는 오버플로우)
        side: 'right',
        forbiddenRows: [],
        preferredRows: [4, 5, 6], // 4-6행만 선호
    },
    SPECIAL: {
        part: 'SPECIAL',
        allowedRows: [1, 6],
        side: 'both',
        forbiddenRows: [],
        preferredRows: [1, 2, 3, 4, 5, 6],
    },
};

/**
 * 좌석 데이터 타입 (API 응답)
 */
interface SeatData {
    seat_row: number;
    seat_column: number;
    part: Part;
}

/**
 * 과거 배치 데이터에서 파트별 영역 통계를 분석합니다.
 *
 * @param seats - 과거 배치의 좌석 데이터 배열
 * @returns 파트별 영역 통계 Map
 */
export function analyzePartZonesFromSeats(
    seats: SeatData[]
): Map<Part, PartZoneStatistics> {
    const statsMap = new Map<Part, PartZoneStatistics>();
    const partSeats = new Map<Part, SeatData[]>();

    // 파트별로 좌석 그룹화
    seats.forEach((seat) => {
        const existing = partSeats.get(seat.part) || [];
        existing.push(seat);
        partSeats.set(seat.part, existing);
    });

    // 각 파트별 통계 계산
    partSeats.forEach((partSeatList, part) => {
        const rowDist: Record<number, number> = {};
        const colDist: Record<number, number> = {};
        let sumRow = 0;
        let sumCol = 0;
        let minRow = Infinity;
        let maxRow = -Infinity;
        let minCol = Infinity;
        let maxCol = -Infinity;

        partSeatList.forEach((seat) => {
            // 행 분포
            rowDist[seat.seat_row] = (rowDist[seat.seat_row] || 0) + 1;
            // 열 분포
            colDist[seat.seat_column] = (colDist[seat.seat_column] || 0) + 1;
            // 합계
            sumRow += seat.seat_row;
            sumCol += seat.seat_column;
            // 범위
            minRow = Math.min(minRow, seat.seat_row);
            maxRow = Math.max(maxRow, seat.seat_row);
            minCol = Math.min(minCol, seat.seat_column);
            maxCol = Math.max(maxCol, seat.seat_column);
        });

        const total = partSeatList.length;

        statsMap.set(part, {
            part,
            rowDistribution: rowDist,
            colDistribution: colDist,
            avgRow: total > 0 ? sumRow / total : 0,
            avgCol: total > 0 ? sumCol / total : 0,
            totalSeats: total,
            minRow: minRow === Infinity ? 0 : minRow,
            maxRow: maxRow === -Infinity ? 0 : maxRow,
            minCol: minCol === Infinity ? 0 : minCol,
            maxCol: maxCol === -Infinity ? 0 : maxCol,
        });
    });

    return statsMap;
}

/**
 * 통계 데이터를 기반으로 동적 파트 영역을 계산합니다.
 *
 * @param stats - 파트별 영역 통계
 * @param totalRows - 현재 그리드의 총 행 수
 * @returns 파트별 영역 정의 Map
 */
export function calculateDynamicPartZones(
    stats: Map<Part, PartZoneStatistics>,
    totalRows: number
): Map<Part, PartZone> {
    const zones = new Map<Part, PartZone>();

    // 각 파트별 영역 계산
    (['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] as Part[]).forEach((part) => {
        const partStats = stats.get(part);
        const defaultZone = DEFAULT_PART_ZONES[part];

        if (!partStats || partStats.totalSeats === 0) {
            // 통계 없으면 기본값 사용
            zones.set(part, { ...defaultZone });
            return;
        }

        // 통계 기반 영역 계산
        const avgRow = partStats.avgRow;
        const avgCol = partStats.avgCol;

        // 측면 결정: 평균 열 위치 기반
        // 중앙을 기준으로 왼쪽(1-7열)이면 'left', 오른쪽(8-15열)이면 'right'
        const side: 'left' | 'right' | 'both' =
            avgCol <= 7 ? 'left' : avgCol >= 9 ? 'right' : 'both';

        // 행 범위 계산: 통계 + 여유 1행
        const minRow = Math.max(1, partStats.minRow - 1);
        const maxRow = Math.min(totalRows, partStats.maxRow + 1);

        // 선호 행 계산: 빈도 기반 정렬
        const preferredRows = Object.entries(partStats.rowDistribution)
            .sort((a, b) => b[1] - a[1]) // 빈도 내림차순
            .map(([row]) => parseInt(row));

        // 금지 행: 기본 규칙 유지 (특히 ALTO 5-6행)
        const forbiddenRows = defaultZone.forbiddenRows;

        zones.set(part, {
            part,
            allowedRows: [minRow, maxRow],
            side,
            forbiddenRows,
            preferredRows:
                preferredRows.length > 0 ? preferredRows : defaultZone.preferredRows,
        });
    });

    return zones;
}

/**
 * 특정 좌석이 해당 파트의 영역 내에 있는지 확인합니다.
 *
 * @param row - 행 번호 (1-based)
 * @param col - 열 번호 (1-based)
 * @param part - 파트
 * @param zone - 파트 영역 정의
 * @param maxColInRow - 해당 행의 최대 열 수
 * @returns 영역 내 여부
 */
export function isInPartZone(
    row: number,
    col: number,
    part: Part,
    zone: PartZone,
    maxColInRow: number
): boolean {
    // 금지 행 체크
    if (zone.forbiddenRows.includes(row)) {
        return false;
    }

    // 허용 행 범위 체크
    if (row < zone.allowedRows[0] || row > zone.allowedRows[1]) {
        return false;
    }

    // 측면 체크
    // left side: 1 ~ midCol-1 열 (예: 15열 그리드에서 1-7열)
    // right side: midCol ~ maxCol 열 (예: 15열 그리드에서 8-15열)
    if (zone.side !== 'both') {
        const midCol = Math.ceil(maxColInRow / 2);
        if (zone.side === 'left' && col >= midCol) {
            return false;
        }
        if (zone.side === 'right' && col < midCol) {
            return false;
        }
    }

    return true;
}

/**
 * 두 좌석 간의 맨해튼 거리를 계산합니다.
 */
export function manhattanDistance(
    pos1: { row: number; col: number },
    pos2: { row: number; col: number }
): number {
    return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
}

/**
 * 파트 영역 내에서 빈 좌석 중 가장 가까운 것을 찾습니다.
 *
 * @param targetPos - 대상 위치
 * @param emptySeats - 빈 좌석 목록
 * @param part - 파트
 * @param zone - 파트 영역 정의
 * @param rowCapacities - 행별 용량
 * @returns 가장 가까운 빈 좌석 또는 null
 */
export function findNearestEmptySeatInZone(
    targetPos: { row: number; col: number },
    emptySeats: Array<{ row: number; col: number }>,
    part: Part,
    zone: PartZone,
    rowCapacities: number[]
): { row: number; col: number } | null {
    let nearest: { row: number; col: number } | null = null;
    let minDistance = Infinity;

    for (const seat of emptySeats) {
        const maxColInRow = rowCapacities[seat.row - 1] || 0;

        if (!isInPartZone(seat.row, seat.col, part, zone, maxColInRow)) {
            continue;
        }

        const distance = manhattanDistance(targetPos, seat);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = seat;
        }
    }

    return nearest;
}

/**
 * 확장된 파트 영역 내에서 빈 좌석을 찾습니다.
 *
 * 탐색 순서:
 * 1. 기본 파트 영역 내
 * 2. 파트 영역 경계 ±1행 확장 (측면 제약 유지)
 * 3. 전체 그리드에서 가장 가까운 좌석 (fallback)
 *
 * @param targetPos - 대상 위치
 * @param emptySeats - 빈 좌석 목록
 * @param part - 파트
 * @param zone - 파트 영역 정의
 * @param rowCapacities - 행별 용량
 * @param enableFallback - 전체 그리드 탐색 허용 여부 (기본: false)
 * @returns 가장 가까운 빈 좌석 또는 null
 */
export function findNearestEmptySeatInExpandedZone(
    targetPos: { row: number; col: number },
    emptySeats: Array<{ row: number; col: number }>,
    part: Part,
    zone: PartZone,
    rowCapacities: number[],
    enableFallback: boolean = false
): { row: number; col: number; searchLevel: 'primary' | 'expanded' | 'fallback' } | null {
    // 1차: 기본 파트 영역 탐색
    const primaryResult = findNearestEmptySeatInZone(
        targetPos,
        emptySeats,
        part,
        zone,
        rowCapacities
    );

    if (primaryResult) {
        return { ...primaryResult, searchLevel: 'primary' };
    }

    // 2차: 확장 영역 탐색 (±1행, 측면 제약 유지)
    const expandedZone: PartZone = {
        ...zone,
        allowedRows: [
            Math.max(1, zone.allowedRows[0] - 1),
            Math.min(rowCapacities.length, zone.allowedRows[1] + 1),
        ],
        // ALTO 금지 행은 여전히 유지 (5, 6행)
        forbiddenRows: zone.forbiddenRows,
    };

    const expandedResult = findNearestEmptySeatInZone(
        targetPos,
        emptySeats,
        part,
        expandedZone,
        rowCapacities
    );

    if (expandedResult) {
        return { ...expandedResult, searchLevel: 'expanded' };
    }

    // 3차: 전체 그리드 탐색 (fallback, 선택적)
    if (enableFallback && emptySeats.length > 0) {
        // 측면 제약만 유지하고 행 제한 제거
        const fallbackZone: PartZone = {
            ...zone,
            allowedRows: [1, rowCapacities.length],
            forbiddenRows: [], // 금지 행도 제거
        };

        const fallbackResult = findNearestEmptySeatInZone(
            targetPos,
            emptySeats,
            part,
            fallbackZone,
            rowCapacities
        );

        if (fallbackResult) {
            return { ...fallbackResult, searchLevel: 'fallback' };
        }

        // 최후의 수단: 아무 빈 좌석이라도
        let nearest: { row: number; col: number } | null = null;
        let minDistance = Infinity;

        for (const seat of emptySeats) {
            const distance = manhattanDistance(targetPos, seat);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = seat;
            }
        }

        if (nearest) {
            return { ...nearest, searchLevel: 'fallback' };
        }
    }

    return null;
}
