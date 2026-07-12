import { renderHook, waitFor } from '@testing-library/react';

import { useArrangementInitialization } from '@/hooks/useArrangementInitialization';
import type { ArrangementWithSeats } from '@/hooks/useArrangements';

import { useArrangementStore } from '@/store/arrangement-store';

jest.mock('@/lib/toast', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showInfo: jest.fn(),
  showWarning: jest.fn(),
}));

/**
 * AI 추천 분배 무한 루프 회귀 테스트
 *
 * 등단 인원이 추천기의 물리 상한(줄 수 × 줄당 최대 = 120석)을 초과하면
 * 추천 좌석 합계가 인원수보다 작아진다. 과거에는 수렴 조건이
 * `합계 === totalMembers`여서 이 경우 setGridLayout이 무한 반복되며
 * React #185(Maximum update depth exceeded)로 페이지가 크래시했다.
 */
describe('useArrangementInitialization', () => {
  const baseArrangement = {
    id: 'arr-1',
    date: '2026-07-19',
    status: 'DRAFT',
    grid_layout: null,
    seats: [],
  } as unknown as ArrangementWithSeats;

  function makeParams(totalMembers: number) {
    return {
      id: 'arr-1',
      arrangement: baseArrangement,
      attendances: [] as unknown[],
      isServiceAvailable: () => true,
      totalMembers,
      dbHasData: false,
      showRestoreDialog: false,
      skipInitialization: false,
      arrangementDate: '2026-07-19',
    };
  }

  beforeEach(() => {
    // 전역 zustand 스토어 초기화
    const store = useArrangementStore.getState();
    store.clearArrangement();
    store.clearHistory();
    store.resetWorkflow();
    store.setGridLayout(null, { silent: true });
  });

  it('인원이 추천 상한(120석)을 초과해도 무한 루프 없이 그리드가 수렴한다', async () => {
    // 크래시 시나리오: 128명 (로컬 seed의 정대원 98 + 게스트 30)
    // 버그가 있으면 renderHook 내부에서 Maximum update depth exceeded가 발생한다
    renderHook(() => useArrangementInitialization(makeParams(128)));

    await waitFor(() => {
      const gridLayout = useArrangementStore.getState().gridLayout;
      expect(gridLayout?.isAIRecommended).toBe(true);
    });

    const gridLayout = useArrangementStore.getState().gridLayout!;
    const sum = gridLayout.rowCapacities.reduce((a, b) => a + b, 0);
    // 상한에 맞게 잘린 좌석 수로 안정화 (인원수보다 작을 수 있음)
    expect(sum).toBeGreaterThan(0);
    expect(sum).toBeLessThanOrEqual(128);
  });

  it('인원이 상한 이내면 인원수와 동일한 좌석 수로 그리드가 설정된다', async () => {
    renderHook(() => useArrangementInitialization(makeParams(98)));

    await waitFor(() => {
      const gridLayout = useArrangementStore.getState().gridLayout;
      expect(gridLayout?.isAIRecommended).toBe(true);
    });

    const gridLayout = useArrangementStore.getState().gridLayout!;
    const sum = gridLayout.rowCapacities.reduce((a, b) => a + b, 0);
    expect(sum).toBe(98);
  });
});
