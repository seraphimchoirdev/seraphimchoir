/**
 * Grid Utilities
 * 가변형 지그재그 계단형 좌석 그리드 시스템을 위한 유틸리티 함수
 */

import { GridLayout, GRID_CONSTRAINTS } from '@/types/grid';

/**
 * 전체 인원을 지정된 줄 수로 균등 분배
 * 나머지는 뒤쪽 줄부터 배분 (지휘자에서 가까운 줄에 더 많이)
 *
 * @param totalMembers 전체 대원 수
 * @param numRows 줄 수
 * @returns 각 줄별 인원 수 배열
 *
 * @example
 * autoDistributeSeats(80, 6) // → [13, 13, 13, 13, 14, 14]
 */
export function autoDistributeSeats(
  totalMembers: number,
  numRows: number
): number[] {
  if (totalMembers <= 0 || numRows <= 0) {
    return Array(numRows).fill(0);
  }

  const baseCapacity = Math.floor(totalMembers / numRows);
  const remainder = totalMembers % numRows;

  const capacities = Array(numRows).fill(baseCapacity);

  // 나머지를 뒤쪽 줄부터 분배
  for (let i = 0; i < remainder; i++) {
    capacities[numRows - 1 - i]++;
  }

  return capacities;
}

/**
 * 그리드 레이아웃 유효성 검증
 *
 * @param layout 검증할 그리드 레이아웃
 * @returns 유효하면 true, 그렇지 않으면 false
 */
export function validateGridLayout(layout: GridLayout): boolean {
  // 행 수 범위 검사
  if (
    layout.rows < GRID_CONSTRAINTS.MIN_ROWS ||
    layout.rows > GRID_CONSTRAINTS.MAX_ROWS
  ) {
    return false;
  }

  // rowCapacities 배열 길이 검사
  if (layout.rowCapacities.length !== layout.rows) {
    return false;
  }

  // 각 행의 인원 수 범위 검사
  for (const capacity of layout.rowCapacities) {
    if (
      capacity < GRID_CONSTRAINTS.MIN_CAPACITY_PER_ROW ||
      capacity > GRID_CONSTRAINTS.MAX_CAPACITY_PER_ROW
    ) {
      return false;
    }
  }

  return true;
}

/**
 * 총 좌석 수 계산
 *
 * @param layout 그리드 레이아웃
 * @returns 전체 좌석 수
 */
export function calculateTotalSeats(layout: GridLayout): number {
  return layout.rowCapacities.reduce((sum, capacity) => sum + capacity, 0);
}

/**
 * 최대 행 인원 수 계산 (CSS Grid 컬럼 수 결정에 사용)
 *
 * @param layout 그리드 레이아웃
 * @returns 가장 인원이 많은 행의 인원 수
 */
export function getMaxRowCapacity(layout: GridLayout): number {
  return Math.max(...layout.rowCapacities, 0);
}
