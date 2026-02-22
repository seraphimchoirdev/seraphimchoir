/**
 * useMyProfile / useUpdateMyProfile 테스트
 */
import { createTestQueryWrapper } from '@/__tests__/helpers/query-wrapper';
import { renderHook, waitFor } from '@testing-library/react';

import { useMyProfile, useUpdateMyProfile } from '../useMyProfile';

// fetch 모킹
global.fetch = jest.fn();

const mockProfile = {
  id: 'user-1',
  email: 'test@test.com',
  name: '홍길동',
  role: 'ADMIN',
  linked_member_id: 'member-1',
  link_status: 'approved' as const,
  member: {
    id: 'member-1',
    name: '홍길동',
    part: 'TENOR',
    height_cm: 175,
    regular_member_since: '2023-01-01',
    last_service_date: '2024-03-03',
    last_practice_date: '2024-03-02',
  },
};

describe('useMyProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('프로필 조회 성공', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    });

    const { result } = renderHook(() => useMyProfile(), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProfile);
    expect(global.fetch).toHaveBeenCalledWith('/api/my-profile');
  });

  it('에러 응답 시 isError === true', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '프로필을 불러오는데 실패했습니다.' }),
    });

    const { result } = renderHook(() => useMyProfile(), {
      wrapper: createTestQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('프로필을 불러오는데 실패했습니다');
  });
});

describe('useUpdateMyProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('프로필 수정 성공', async () => {
    const updatedProfile = { ...mockProfile, member: { ...mockProfile.member, height_cm: 180 } };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedProfile,
    });

    const { result } = renderHook(() => useUpdateMyProfile(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({ height_cm: 180 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/my-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ height_cm: 180 }),
    });
  });

  it('수정 실패 시 에러', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '정보 수정에 실패했습니다.' }),
    });

    const { result } = renderHook(() => useUpdateMyProfile(), {
      wrapper: createTestQueryWrapper(),
    });

    result.current.mutate({ height_cm: 180 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('정보 수정에 실패했습니다');
  });
});
