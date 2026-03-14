/**
 * useServiceSchedules / useServiceScheduleByDate / useServiceSchedule
 * useCreateServiceSchedule / useUpdateServiceSchedule / useDeleteServiceSchedule 테스트
 */
import { renderHook, waitFor } from '@testing-library/react';

import { createTestQueryWrapper } from '@/__tests__/helpers/query-wrapper';

import {
  useCreateServiceSchedule,
  useDeleteServiceSchedule,
  useServiceSchedule,
  useServiceScheduleByDate,
  useServiceSchedules,
  useUpdateServiceSchedule,
} from '../useServiceSchedules';

// fetch 모킹
global.fetch = jest.fn();

const mockSchedule = {
  id: 's1',
  date: '2024-03-03',
  service_type: '주일예배',
  hymn_name: '은혜',
  offertory_performer: null,
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
};

const mockListResponse = {
  data: [
    mockSchedule,
    { ...mockSchedule, id: 's2', date: '2024-03-10', hymn_name: '사랑' },
  ],
  meta: { total: 2 },
};

describe('useServiceSchedules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('기본 목록 조회 성공', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockListResponse,
    });

    const { result } = renderHook(() => useServiceSchedules(), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.meta.total).toBe(2);
  });

  it('year+month 필터 시 URL 파라미터 포함', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockListResponse,
    });

    const { result } = renderHook(
      () => useServiceSchedules({ year: 2024, month: 3 }),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('year=2024');
    expect(calledUrl).toContain('month=3');
  });

  it('에러 응답 시 isError', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '서버 오류' }),
    });

    const { result } = renderHook(() => useServiceSchedules(), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('서버 오류');
  });
});

describe('useServiceScheduleByDate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('단일 날짜 조회 (첫 번째 결과 반환)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [mockSchedule],
        meta: { total: 1 },
      }),
    });

    const { result } = renderHook(
      () => useServiceScheduleByDate('2024-03-03'),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe('s1');
    expect(result.current.data?.date).toBe('2024-03-03');
  });

  it('date=undefined -> 비활성화', () => {
    const { result } = renderHook(
      () => useServiceScheduleByDate(undefined),
      { wrapper: createTestQueryWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useServiceSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('단일 ID 조회', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSchedule,
    });

    const { result } = renderHook(() => useServiceSchedule('s1'), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe('s1');
    expect(global.fetch).toHaveBeenCalledWith('/api/service-schedules/s1');
  });

  it('id=undefined -> 비활성화', () => {
    const { result } = renderHook(() => useServiceSchedule(undefined), {
      wrapper: createTestQueryWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useCreateServiceSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('생성 성공', async () => {
    const created = { ...mockSchedule, id: 'new-id' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => created,
    });

    const { result } = renderHook(() => useCreateServiceSchedule(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({
      date: '2024-03-17',
      service_type: '주일예배',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/service-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2024-03-17',
        service_type: '주일예배',
      }),
    });
  });
});

describe('useUpdateServiceSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('수정 성공', async () => {
    const updated = { ...mockSchedule, hymn_name: '새찬양' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => updated,
    });

    const { result } = renderHook(() => useUpdateServiceSchedule(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({ id: 's1', data: { hymn_name: '새찬양' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/service-schedules/s1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hymn_name: '새찬양' }),
    });
  });
});

describe('useDeleteServiceSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('삭제 성공', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useDeleteServiceSchedule(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate('s1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/service-schedules/s1', {
      method: 'DELETE',
    });
  });
});
