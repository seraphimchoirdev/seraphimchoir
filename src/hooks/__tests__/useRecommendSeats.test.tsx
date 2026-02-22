/**
 * useRecommendSeats 테스트
 *
 * useMutation + fetch 기반 AI 추천 Hook
 */
import { createTestQueryWrapper } from '@/__tests__/helpers/query-wrapper';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useRecommendSeats } from '../useRecommendSeats';

global.fetch = jest.fn();

describe('useRecommendSeats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST 성공 → RecommendationResponse 반환', async () => {
    const mockResponse = {
      seats: [{ memberId: 'm-1', memberName: '홍길동', row: 1, col: 1, part: 'SOPRANO' }],
      qualityScore: 85,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useRecommendSeats(), {
      wrapper: createTestQueryWrapper(),
    });

    await act(async () => {
      result.current.mutate({ arrangementId: 'arr-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/arrangements/arr-1/recommend',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('gridLayout 전달 시 body에 포함', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ seats: [] }),
    });

    const { result } = renderHook(() => useRecommendSeats(), {
      wrapper: createTestQueryWrapper(),
    });

    const gridLayout = {
      rows: 6,
      rowCapacities: [14, 14, 14, 14, 14, 14],
      zigzagPattern: 'none' as const,
    };

    await act(async () => {
      result.current.mutate({ arrangementId: 'arr-1', gridLayout });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(callBody.gridLayout).toEqual({
      rows: 6,
      rowCapacities: [14, 14, 14, 14, 14, 14],
      zigzagPattern: 'none',
    });
  });

  it('API 에러 → Error throw', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'AI 서비스 장애' }),
    });

    const { result } = renderHook(() => useRecommendSeats(), {
      wrapper: createTestQueryWrapper(),
    });

    await act(async () => {
      result.current.mutate({ arrangementId: 'arr-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('AI 서비스 장애');
  });

  it('preserveGridLayout 기본값 true', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ seats: [] }),
    });

    const { result } = renderHook(() => useRecommendSeats(), {
      wrapper: createTestQueryWrapper(),
    });

    await act(async () => {
      result.current.mutate({ arrangementId: 'arr-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(callBody.preserveGridLayout).toBe(true);
  });

  it('preserveGridLayout=false 전달', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ seats: [] }),
    });

    const { result } = renderHook(() => useRecommendSeats(), {
      wrapper: createTestQueryWrapper(),
    });

    await act(async () => {
      result.current.mutate({ arrangementId: 'arr-1', preserveGridLayout: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(callBody.preserveGridLayout).toBe(false);
  });

  it('에러 응답 JSON 파싱 실패 시 status code 포함 메시지', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const { result } = renderHook(() => useRecommendSeats(), {
      wrapper: createTestQueryWrapper(),
    });

    await act(async () => {
      result.current.mutate({ arrangementId: 'arr-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('503');
  });
});
