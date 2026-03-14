/**
 * useArrangements / useArrangement / useCreateArrangement / useUpdateArrangement / useDeleteArrangement 테스트
 */
import { renderHook, waitFor } from '@testing-library/react';

import { createTestQueryWrapper } from '@/__tests__/helpers/query-wrapper';

import {
  useArrangement,
  useArrangements,
  useCreateArrangement,
  useDeleteArrangement,
  useUpdateArrangement,
} from '../useArrangements';

// fetch 모킹
global.fetch = jest.fn();

const mockArrangement = {
  id: 'arr-1',
  title: '2024년 1월 1주 배치',
  date: '2024-01-07',
  conductor: '김지휘',
  service_info: '주일예배',
  grid_rows: 6,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockPaginatedResponse = {
  data: [mockArrangement, { ...mockArrangement, id: 'arr-2', title: '2024년 1월 2주 배치' }],
  meta: {
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
};

describe('useArrangements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('기본 목록 조회 성공 (PaginatedResponse)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaginatedResponse,
    });

    const { result } = renderHook(() => useArrangements(), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPaginatedResponse);
    expect(result.current.data?.meta.total).toBe(2);
  });

  it('날짜 필터 적용 시 URL 쿼리 파라미터 포함', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaginatedResponse,
    });

    const { result } = renderHook(
      () => useArrangements({ startDate: '2024-01-01', endDate: '2024-01-31' }),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('startDate=2024-01-01');
    expect(calledUrl).toContain('endDate=2024-01-31');
  });

  it('serviceType 필터 적용', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaginatedResponse,
    });

    const { result } = renderHook(
      () => useArrangements({ serviceType: '주일예배' }),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('serviceType=');
  });

  it('search 필터 적용', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaginatedResponse,
    });

    const { result } = renderHook(
      () => useArrangements({ search: '1월' }),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('search=1%EC%9B%94');
  });

  it('에러 응답 시 isError === true', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '서버 오류' }),
    });

    const { result } = renderHook(() => useArrangements(), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('서버 오류');
  });
});

describe('useArrangement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('단일 조회 성공 (seats 포함)', async () => {
    const arrangementWithSeats = {
      ...mockArrangement,
      seats: [{ id: 's1', member_id: 'm1', seat_row: 1, seat_column: 1 }],
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => arrangementWithSeats,
    });

    const { result } = renderHook(() => useArrangement('arr-1'), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe('arr-1');
    expect(global.fetch).toHaveBeenCalledWith('/api/arrangements/arr-1');
  });

  it('id=undefined → 쿼리 비활성화', () => {
    const { result } = renderHook(() => useArrangement(undefined), {
      wrapper: createTestQueryWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useCreateArrangement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('생성 성공 후 arrangements 쿼리 무효화', async () => {
    const created = { ...mockArrangement, id: 'new-id' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => created,
    });

    const { result } = renderHook(() => useCreateArrangement(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({
      title: '새 배치표',
      date: '2024-02-04',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/arrangements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '새 배치표', date: '2024-02-04' }),
    });
  });
});

describe('useUpdateArrangement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('수정 성공', async () => {
    const updated = { ...mockArrangement, title: '수정된 배치' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => updated,
    });

    const { result } = renderHook(() => useUpdateArrangement(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({ id: 'arr-1', data: { title: '수정된 배치' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/arrangements/arr-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '수정된 배치' }),
    });
  });
});

describe('useDeleteArrangement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('삭제 성공', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: '삭제 완료' }),
    });

    const { result } = renderHook(() => useDeleteArrangement(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate('arr-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/arrangements/arr-1', {
      method: 'DELETE',
    });
  });
});
