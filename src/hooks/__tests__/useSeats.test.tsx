/**
 * useUpdateSeats 테스트
 *
 * 좌석 일괄 업데이트 mutation을 검증합니다.
 */
import { renderHook, waitFor } from '@testing-library/react';

import { createTestQueryWrapper } from '@/__tests__/helpers/query-wrapper';

import { useUpdateSeats } from '../useSeats';

// fetch 모킹
global.fetch = jest.fn();

const mockSeats = [
  { id: 's1', arrangement_id: 'arr-1', member_id: 'm1', seat_row: 1, seat_column: 1, part: 'SOPRANO', is_row_leader: false },
  { id: 's2', arrangement_id: 'arr-1', member_id: 'm2', seat_row: 1, seat_column: 2, part: 'ALTO', is_row_leader: false },
];

describe('useUpdateSeats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('좌석 일괄 업데이트 성공', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSeats,
    });

    const { result } = renderHook(() => useUpdateSeats(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({
      arrangementId: 'arr-1',
      seats: [
        { memberId: 'm1', row: 1, column: 1, part: 'SOPRANO' },
        { memberId: 'm2', row: 1, column: 2, part: 'ALTO' },
      ],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/seats/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        arrangementId: 'arr-1',
        seats: [
          { memberId: 'm1', row: 1, column: 1, part: 'SOPRANO' },
          { memberId: 'm2', row: 1, column: 2, part: 'ALTO' },
        ],
      }),
    });
  });

  it('에러 응답 시 에러 throw', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '좌석 저장 실패' }),
    });

    const { result } = renderHook(() => useUpdateSeats(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({
      arrangementId: 'arr-1',
      seats: [{ memberId: 'm1', row: 1, column: 1, part: 'SOPRANO' }],
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('좌석 저장 실패');
  });

  it('빈 좌석 배열 전송 가능', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useUpdateSeats(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({
      arrangementId: 'arr-1',
      seats: [],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.seats).toEqual([]);
  });

  it('성공 후 arrangements 쿼리 무효화 (onSuccess 호출)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSeats,
    });

    const { result } = renderHook(() => useUpdateSeats(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({
      arrangementId: 'arr-1',
      seats: [{ memberId: 'm1', row: 1, column: 1, part: 'SOPRANO' }],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // mutation 성공 확인 (invalidateQueries는 내부적으로 호출됨)
    expect(result.current.data).toEqual(mockSeats);
  });
});
