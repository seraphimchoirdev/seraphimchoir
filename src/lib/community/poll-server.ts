import { createAdminClient } from '@/lib/supabase/server';

import type { Poll, PollVoter } from '@/types/community';

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

/**
 * user_id 목록 → PollVoter(이름/파트) Map.
 * 목록/상세/응답 조회에서 공용으로 사용한다.
 */
export async function fetchVoterMap(
  adminClient: AdminClient,
  userIds: string[]
): Promise<Map<string, PollVoter>> {
  const map = new Map<string, PollVoter>();
  if (userIds.length === 0) return map;

  const { data } = await adminClient
    .from('user_profiles')
    .select('id, name, linked_member:members(part)')
    .in('id', [...new Set(userIds)]);

  for (const u of data ?? []) {
    const linked = u.linked_member as unknown as { part: string } | null;
    map.set(u.id, {
      user_id: u.id,
      name: u.name || '알 수 없음',
      part: linked?.part || null,
    });
  }
  return map;
}

/** 마감 시각이 지났거나 수동 마감된 설문인지 */
export function isEffectivelyClosed(
  poll: Pick<Poll, 'is_closed' | 'deadline_at'>
): boolean {
  if (poll.is_closed) return true;
  if (poll.deadline_at && new Date(poll.deadline_at) <= new Date()) return true;
  return false;
}
