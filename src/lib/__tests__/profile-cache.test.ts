import type { SupabaseClient } from '@supabase/supabase-js';

import { getProfileCached, invalidateProfileCache } from '@/lib/profile-cache';

/**
 * user_profiles 단기 캐시 (B8) 동작 검증
 *
 * 모듈 레벨 캐시가 테스트 간 공유되므로 테스트마다 고유한 userId를 사용한다.
 */

function createMockSupabase(profile: Record<string, unknown> | null) {
  const single = jest.fn().mockResolvedValue({ data: profile, error: null });
  const eq = jest.fn().mockReturnValue({ single });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  return { client: { from } as unknown as SupabaseClient, from, single };
}

function makeProfile(id: string) {
  return {
    id,
    role: 'MEMBER',
    linked_member_id: 'member-1',
    link_status: 'approved' as const,
  };
}

describe('getProfileCached', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('첫 호출은 DB를 조회하고, TTL 내 재호출은 캐시를 반환한다', async () => {
    const userId = 'user-cache-hit';
    const { client, from } = createMockSupabase(makeProfile(userId));

    const first = await getProfileCached(client, userId);
    const second = await getProfileCached(client, userId);

    expect(first).toEqual(makeProfile(userId));
    expect(second).toEqual(makeProfile(userId));
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('TTL(60초) 경과 후에는 다시 DB를 조회한다', async () => {
    jest.useFakeTimers();
    const userId = 'user-ttl-expire';
    const { client, from } = createMockSupabase(makeProfile(userId));

    await getProfileCached(client, userId);
    jest.advanceTimersByTime(61 * 1000);
    await getProfileCached(client, userId);

    expect(from).toHaveBeenCalledTimes(2);
  });

  it('invalidateProfileCache 호출 후에는 다시 DB를 조회한다', async () => {
    const userId = 'user-invalidate';
    const { client, from } = createMockSupabase(makeProfile(userId));

    await getProfileCached(client, userId);
    invalidateProfileCache(userId);
    await getProfileCached(client, userId);

    expect(from).toHaveBeenCalledTimes(2);
  });

  it('프로필이 없으면 null을 반환하고 캐시하지 않는다', async () => {
    const userId = 'user-missing';
    const { client, from } = createMockSupabase(null);

    const first = await getProfileCached(client, userId);
    const second = await getProfileCached(client, userId);

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(from).toHaveBeenCalledTimes(2);
  });

  it('사용자별로 캐시가 분리된다', async () => {
    const a = createMockSupabase(makeProfile('user-a'));
    const b = createMockSupabase(makeProfile('user-b'));

    const profileA = await getProfileCached(a.client, 'user-a');
    const profileB = await getProfileCached(b.client, 'user-b');

    expect(profileA?.id).toBe('user-a');
    expect(profileB?.id).toBe('user-b');
  });
});
