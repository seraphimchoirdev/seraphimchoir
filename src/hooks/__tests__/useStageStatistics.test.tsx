/**
 * useStageStatistics 테스트
 */
import { createTestQueryWrapper } from '@/__tests__/helpers/query-wrapper';
import { renderHook, waitFor } from '@testing-library/react';

import { useStageStatistics } from '../useStageStatistics';

global.fetch = jest.fn();

const START_DATE = '2025-01-01';
const END_DATE = '2025-12-31';

describe('useStageStatistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('정상 조회 → 데이터 반환', async () => {
    const mockData = {
      summary: { totalServices: 50, averageMembers: 72 },
      byPart: [],
      byMonth: [],
      byDate: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(
      () => useStageStatistics({ startDate: START_DATE, endDate: END_DATE }),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('start_date=2025-01-01');
    expect(calledUrl).toContain('end_date=2025-12-31');
  });

  it('API 에러 → error.message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '등단 통계 조회 실패' }),
    });

    const { result } = renderHook(
      () => useStageStatistics({ startDate: START_DATE, endDate: END_DATE }),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('등단 통계 조회 실패');
  });

  it('startDate 빈값 → 비활성화 (enabled=false)', () => {
    const { result } = renderHook(() => useStageStatistics({ startDate: '', endDate: END_DATE }), {
      wrapper: createTestQueryWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('endDate 빈값 → 비활성화', () => {
    const { result } = renderHook(
      () => useStageStatistics({ startDate: START_DATE, endDate: '' }),
      { wrapper: createTestQueryWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('serviceType 포함 시 쿼리 파라미터 추가', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ summary: {}, byPart: [], byMonth: [], byDate: [] }),
    });

    const { result } = renderHook(
      () =>
        useStageStatistics({
          startDate: START_DATE,
          endDate: END_DATE,
          serviceType: '2부예배',
        }),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('service_type=2%EB%B6%80%EC%98%88%EB%B0%B0');
  });
});
