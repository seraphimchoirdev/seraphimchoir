/**
 * 줄반장 자동 지정 유틸리티
 *
 * 패턴 (총 8명):
 * - 왼쪽 영역 (소프라노/테너) 3명:
 *   1. 1행 파트 경계의 소프라노
 *   2. 3행 파트 경계의 소프라노
 *   3. 5행 파트 경계의 테너
 *
 * - 오른쪽 영역 (알토/베이스) 5명:
 *   1. 1행 중앙선 경계의 알토
 *   2. 1~3행 알토 인원의 중간 위치
 *   3. 4, 5, 6행 각각의 파트 경계 베이스 (3명)
 */
import { createLogger } from '@/lib/logger';

import { type SeatAssignment, getPartSide } from '@/store/arrangement-store';

import type { Database } from '@/types/database.types';
import type { GridLayout } from '@/types/grid';

const logger = createLogger({ prefix: 'RowLeaderUtils' });

type Part = Database['public']['Enums']['part'];

/**
 * 파트 경계 정보
 */
interface PartBoundary {
  /** 왼쪽 파트의 마지막 열 (가장 오른쪽 소프라노/테너) */
  leftPartLastCol: number | null;
  /** 오른쪽 파트의 첫 번째 열 (가장 왼쪽 알토/베이스) */
  rightPartFirstCol: number | null;
}

/**
 * 줄반장 후보
 */
export interface RowLeaderCandidate {
  row: number;
  col: number;
  part: Part;
  side: 'left' | 'right';
  role: 'boundary' | 'middle';
}

/**
 * 특정 행에서 파트 경계 감지
 *
 * @param assignments 좌석 배치 데이터
 * @param row 행 번호 (1-based)
 * @param maxCol 해당 행의 최대 열 수
 * @returns 파트 경계 정보
 */
export function detectPartBoundary(
  assignments: Record<string, SeatAssignment>,
  row: number,
  maxCol: number
): PartBoundary {
  let leftPartLastCol: number | null = null;
  let rightPartFirstCol: number | null = null;

  for (let col = 1; col <= maxCol; col++) {
    const key = `${row}-${col}`;
    const assignment = assignments[key];
    if (!assignment) continue;

    const side = getPartSide(assignment.part);
    if (side === 'left') {
      // 왼쪽 파트면 계속 업데이트 (가장 오른쪽 찾기)
      leftPartLastCol = col;
    } else if (side === 'right' && rightPartFirstCol === null) {
      // 오른쪽 파트면 첫 번째만 기록
      rightPartFirstCol = col;
    }
  }

  return { leftPartLastCol, rightPartFirstCol };
}

/**
 * 특정 파트의 모든 위치 수집
 *
 * @param assignments 좌석 배치 데이터
 * @param targetPart 대상 파트
 * @param rows 검색할 행 목록
 * @param rowCapacities 행별 용량
 * @returns 파트 위치 배열 (행-열 순서로 정렬)
 */
export function collectPartPositions(
  assignments: Record<string, SeatAssignment>,
  targetPart: Part,
  rows: number[],
  rowCapacities: number[]
): Array<{ row: number; col: number }> {
  const positions: Array<{ row: number; col: number }> = [];

  for (const row of rows) {
    if (row > rowCapacities.length || row < 1) continue;
    const maxCol = rowCapacities[row - 1];

    for (let col = 1; col <= maxCol; col++) {
      const key = `${row}-${col}`;
      const assignment = assignments[key];
      if (assignment?.part === targetPart) {
        positions.push({ row, col });
      }
    }
  }

  return positions;
}

/**
 * 특정 파트가 있는 행 목록 찾기
 *
 * @param assignments 좌석 배치 데이터
 * @param targetPart 대상 파트
 * @param rowCapacities 행별 용량
 * @returns 해당 파트가 있는 행 번호 배열
 */
export function findRowsWithPart(
  assignments: Record<string, SeatAssignment>,
  targetPart: Part,
  rowCapacities: number[]
): number[] {
  const rows: number[] = [];

  for (let row = 1; row <= rowCapacities.length; row++) {
    const maxCol = rowCapacities[row - 1];
    for (let col = 1; col <= maxCol; col++) {
      const key = `${row}-${col}`;
      if (assignments[key]?.part === targetPart) {
        rows.push(row);
        break;
      }
    }
  }

  return rows;
}

/**
 * 특정 행에서 특정 파트의 경계 위치 멤버 찾기
 *
 * @param assignments 좌석 배치 데이터
 * @param row 행 번호
 * @param maxCol 최대 열
 * @param targetPart 대상 파트
 * @param boundaryType 경계 타입 ('last' = 가장 오른쪽, 'first' = 가장 왼쪽)
 * @returns 경계 위치 또는 null
 */
function findPartBoundaryMember(
  assignments: Record<string, SeatAssignment>,
  row: number,
  maxCol: number,
  targetPart: Part,
  boundaryType: 'last' | 'first'
): { row: number; col: number } | null {
  let result: { row: number; col: number } | null = null;

  for (let col = 1; col <= maxCol; col++) {
    const key = `${row}-${col}`;
    const assignment = assignments[key];
    if (assignment?.part === targetPart) {
      if (boundaryType === 'first' && result === null) {
        return { row, col };
      }
      if (boundaryType === 'last') {
        result = { row, col };
      }
    }
  }

  return result;
}

/**
 * 줄반장 후보 선정 (메인 알고리즘)
 *
 * @param assignments 좌석 배치 데이터
 * @param gridLayout 그리드 레이아웃
 * @returns 줄반장 후보 배열
 */
export function selectRowLeaders(
  assignments: Record<string, SeatAssignment>,
  gridLayout: GridLayout
): RowLeaderCandidate[] {
  const candidates: RowLeaderCandidate[] = [];
  const { rowCapacities } = gridLayout;
  const selectedKeys = new Set<string>(); // 중복 방지

  // === 왼쪽 영역 (소프라노/테너) - 3명 ===
  // 1행, 3행: 파트 경계의 소프라노
  // 5행: 파트 경계의 테너

  const leftLeaderConfig = [
    { row: 1, part: 'SOPRANO' as Part },
    { row: 3, part: 'SOPRANO' as Part },
    { row: 5, part: 'TENOR' as Part },
  ];

  for (const { row, part } of leftLeaderConfig) {
    if (row > rowCapacities.length) continue;
    const maxCol = rowCapacities[row - 1];

    const position = findPartBoundaryMember(assignments, row, maxCol, part, 'last');
    if (position) {
      const key = `${position.row}-${position.col}`;
      if (!selectedKeys.has(key)) {
        selectedKeys.add(key);
        candidates.push({
          row: position.row,
          col: position.col,
          part,
          side: 'left',
          role: 'boundary',
        });
      }
    }
  }

  // === 오른쪽 영역 (알토/베이스) - 5명 ===

  // 1. 1행 중앙선 경계의 알토 (가장 왼쪽 알토)
  if (rowCapacities.length >= 1) {
    const maxCol = rowCapacities[0];
    const position = findPartBoundaryMember(assignments, 1, maxCol, 'ALTO', 'first');
    if (position) {
      const key = `${position.row}-${position.col}`;
      if (!selectedKeys.has(key)) {
        selectedKeys.add(key);
        candidates.push({
          row: position.row,
          col: position.col,
          part: 'ALTO',
          side: 'right',
          role: 'boundary',
        });
      }
    }
  }

  // 2. 1~3행 알토 인원의 중간 위치
  const altoPositions = collectPartPositions(assignments, 'ALTO', [1, 2, 3], rowCapacities);
  if (altoPositions.length > 0) {
    const middleIndex = Math.ceil(altoPositions.length / 2) - 1;
    const middleAlto = altoPositions[middleIndex];

    const key = `${middleAlto.row}-${middleAlto.col}`;
    if (!selectedKeys.has(key)) {
      selectedKeys.add(key);
      candidates.push({
        row: middleAlto.row,
        col: middleAlto.col,
        part: 'ALTO',
        side: 'right',
        role: 'middle',
      });
    }
  }

  // 3. 베이스 3명: 4, 5, 6행 각각의 파트 경계 (가장 왼쪽 베이스)
  const bassLeaderRows = [4, 5, 6];
  for (const row of bassLeaderRows) {
    if (row > rowCapacities.length) continue;
    const maxCol = rowCapacities[row - 1];

    const position = findPartBoundaryMember(assignments, row, maxCol, 'BASS', 'first');
    if (position) {
      const key = `${position.row}-${position.col}`;
      if (!selectedKeys.has(key)) {
        selectedKeys.add(key);
        candidates.push({
          row: position.row,
          col: position.col,
          part: 'BASS',
          side: 'right',
          role: 'boundary',
        });
      }
    }
  }

  logger.debug(`자동 지정 후보: ${candidates.length}명`, candidates);
  return candidates;
}
