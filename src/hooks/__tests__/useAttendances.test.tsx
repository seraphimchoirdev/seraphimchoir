import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAttendances,
  useAttendance,
  useCreateAttendance,
  useUpdateAttendance,
  useDeleteAttendance,
  useBulkCreateAttendances,
  useBulkUpdateAttendances,
} from '../useAttendances';
import { ReactNode } from 'react';

// fetch 모킹
global.fetch = jest.fn();

// QueryClient 래퍼 생성
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useAttendances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('출석 목록을 성공적으로 조회해야 함', async () => {
    const mockData = [
      {
        id: '1',
        member_id: 'member-1',
        date: '2024-01-01',
        is_available: true,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        members: {
          id: 'member-1',
          name: '홍길동',
          part: 'TENOR' as const,
        },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useAttendances(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
  });

  it('필터를 적용하여 조회해야 함', async () => {
    const mockData = [
      {
        id: '1',
        member_id: 'member-1',
        date: '2024-01-01',
        is_available: true,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        members: {
          id: 'member-1',
          name: '홍길동',
          part: 'TENOR' as const,
        },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(
      () =>
        useAttendances({
          member_id: 'member-1',
          date: '2024-01-01',
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('member_id=member-1')
    );
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('date=2024-01-01'));
  });
});

describe('useAttendance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('특정 출석 기록을 성공적으로 조회해야 함', async () => {
    const mockData = {
      id: '1',
      member_id: 'member-1',
      date: '2024-01-01',
      is_available: true,
      notes: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      members: {
        id: 'member-1',
        name: '홍길동',
        part: 'TENOR' as const,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useAttendance('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith('/api/attendances/1');
  });
});

describe('useCreateAttendance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('출석 기록을 성공적으로 생성해야 함', async () => {
    const mockResponse = {
      id: '1',
      member_id: 'member-1',
      date: '2024-01-01',
      is_available: true,
      notes: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useCreateAttendance(), {
      wrapper: createWrapper(),
    });

    const newAttendance = {
      member_id: 'member-1',
      date: '2024-01-01',
      is_available: true,
    };

    result.current.mutate(newAttendance);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/attendances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newAttendance),
    });
  });
});

describe('useUpdateAttendance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('출석 기록을 성공적으로 수정해야 함', async () => {
    const mockResponse = {
      id: '1',
      member_id: 'member-1',
      date: '2024-01-01',
      is_available: false,
      notes: '결석',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useUpdateAttendance(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: '1',
      data: {
        is_available: false,
        notes: '결석',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/attendances/1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_available: false,
        notes: '결석',
      }),
    });
  });
});

describe('useDeleteAttendance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('출석 기록을 성공적으로 삭제해야 함', async () => {
    const mockResponse = {
      message: '출석 기록이 삭제되었습니다',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useDeleteAttendance(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/attendances/1', {
      method: 'DELETE',
    });
  });
});

describe('useBulkCreateAttendances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('여러 출석 기록을 일괄 생성해야 함', async () => {
    const mockResponse = {
      success: true,
      data: [
        {
          id: '1',
          member_id: 'member-1',
          date: '2024-01-01',
          is_available: true,
          notes: null,
        },
        {
          id: '2',
          member_id: 'member-2',
          date: '2024-01-01',
          is_available: false,
          notes: '결석',
        },
      ],
      summary: {
        total: 2,
        succeeded: 2,
        failed: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useBulkCreateAttendances(), {
      wrapper: createWrapper(),
    });

    const attendances = [
      {
        member_id: 'member-1',
        date: '2024-01-01',
        is_available: true,
      },
      {
        member_id: 'member-2',
        date: '2024-01-01',
        is_available: false,
        notes: '결석',
      },
    ];

    result.current.mutate(attendances);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/attendances/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attendances }),
    });

    expect(result.current.data).toEqual(mockResponse);
  });
});

describe('useBulkUpdateAttendances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('여러 출석 기록을 일괄 수정해야 함', async () => {
    const mockResponse = {
      success: true,
      data: [
        {
          id: '1',
          member_id: 'member-1',
          date: '2024-01-01',
          is_available: true,
          notes: '변경됨',
        },
        {
          id: '2',
          member_id: 'member-2',
          date: '2024-01-01',
          is_available: false,
          notes: '결석',
        },
      ],
      summary: {
        total: 2,
        succeeded: 2,
        failed: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useBulkUpdateAttendances(), {
      wrapper: createWrapper(),
    });

    const updates = [
      {
        id: '1',
        data: {
          is_available: true,
          notes: '변경됨',
        },
      },
      {
        id: '2',
        data: {
          is_available: false,
          notes: '결석',
        },
      },
    ];

    result.current.mutate(updates);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/attendances/batch', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        updates: [
          {
            id: '1',
            is_available: true,
            notes: '변경됨',
          },
          {
            id: '2',
            is_available: false,
            notes: '결석',
          },
        ],
      }),
    });

    expect(result.current.data).toEqual(mockResponse);
  });
});
