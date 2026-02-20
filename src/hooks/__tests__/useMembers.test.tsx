/**
 * useMembers / useMember / useCreateMember / useUpdateMember / useDeleteMember 테스트
 */
import { renderHook, waitFor } from '@testing-library/react';

import { createTestQueryWrapper } from '@/__tests__/helpers/query-wrapper';

import {
  useCreateMember,
  useDeleteMember,
  useMember,
  useMembers,
  useUpdateMember,
} from '../useMembers';

// fetch 모킹
global.fetch = jest.fn();

const mockMember = {
  id: 'm1',
  name: '홍길동',
  part: 'SOPRANO',
  is_leader: false,
  is_singer: true,
  member_status: 'REGULAR',
  version: 1,
};

const mockPaginatedResponse = {
  data: [mockMember, { ...mockMember, id: 'm2', name: '김철수', part: 'TENOR' }],
  meta: {
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
};

describe('useMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('목록 조회 성공 (PaginatedResponse)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaginatedResponse,
    });

    const { result } = renderHook(() => useMembers(), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPaginatedResponse);
    expect(result.current.data?.meta.total).toBe(2);
  });

  it('필터 적용 시 URL 쿼리 파라미터 포함 확인', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaginatedResponse,
    });

    const { result } = renderHook(
      () => useMembers({ part: 'SOPRANO', page: 2, limit: 10 }),
      { wrapper: createTestQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('part=SOPRANO');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('limit=10');
  });

  it('에러 응답 시 isError === true', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '서버 오류' }),
    });

    const { result } = renderHook(() => useMembers(), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('서버 오류');
  });
});

describe('useMember', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('단일 조회 성공', async () => {
    const memberResponse = { data: mockMember };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => memberResponse,
    });

    const { result } = renderHook(() => useMember('m1'), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data.name).toBe('홍길동');
    expect(global.fetch).toHaveBeenCalledWith('/api/members/m1');
  });

  it('id=undefined → 쿼리 비활성화', () => {
    const { result } = renderHook(() => useMember(undefined), {
      wrapper: createTestQueryWrapper(),
    });

    // enabled: false이므로 fetch 호출 없음
    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useCreateMember', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('생성 성공 후 members 쿼리 무효화', async () => {
    const createdMember = { data: { ...mockMember, id: 'new-id', name: '새대원' }, message: '성공' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createdMember,
    });

    const { result } = renderHook(() => useCreateMember(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({
      name: '새대원',
      part: 'SOPRANO',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '새대원', part: 'SOPRANO' }),
    });
  });
});

describe('useUpdateMember', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('수정 성공', async () => {
    const updatedResponse = { data: { ...mockMember, name: '수정됨' }, message: '성공' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedResponse,
    });

    const { result } = renderHook(() => useUpdateMember(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({ id: 'm1', data: { name: '수정됨' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/members/m1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '수정됨' }),
    });
  });

  it('VERSION_CONFLICT 에러 시 error.code 확인', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: '버전 충돌', code: 'VERSION_CONFLICT' }),
    });

    const { result } = renderHook(() => useUpdateMember(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({ id: 'm1', data: { name: '수정됨', version: 1 } });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const error = result.current.error as Error & { code?: string };
    expect(error.code).toBe('VERSION_CONFLICT');
  });
});

describe('useDeleteMember', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('삭제 성공', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: '삭제 완료' }),
    });

    const { result } = renderHook(() => useDeleteMember(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate('m1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/members/m1', {
      method: 'DELETE',
    });
  });

  it('실패 시 에러 throw', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '삭제 실패' }),
    });

    const { result } = renderHook(() => useDeleteMember(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate('m1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('삭제 실패');
  });
});
