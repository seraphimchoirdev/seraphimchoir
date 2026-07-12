import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * user_profiles 단기 인메모리 캐시 (코드 리뷰 B8)
 *
 * 대시보드 카드 4개가 각각 60초 주기로 폴링하면서 요청마다
 * user_profiles를 조회하는 중복을 줄인다. TTL은 폴링 주기와 같은 60초로,
 * 역할 변경·대원 연동 승인 등 프로필 변경은 최대 TTL만큼 늦게 반영될 수
 * 있으나 변경 라우트에서 invalidateProfileCache()를 호출해 같은 인스턴스
 * 내에서는 즉시 반영된다.
 *
 * 서버리스 환경에서는 warm 인스턴스에서만 유효하다. 인스턴스 간 무효화는
 * 불가능하므로 TTL을 늘리거나 권한 판정 이외의 용도로 확장하지 말 것.
 */

export interface CachedUserProfile {
  id: string;
  role: string | null;
  linked_member_id: string | null;
  link_status: 'pending' | 'approved' | 'rejected' | null;
}

const TTL_MS = 60 * 1000;
const MAX_ENTRIES = 1000; // ~100명 규모에서 도달할 일 없는 안전 상한

const cache = new Map<string, { profile: CachedUserProfile; expiresAt: number }>();

/**
 * 캐시에서 프로필을 읽고, 없거나 만료됐으면 조회 후 캐시에 저장한다.
 * 조회 실패(프로필 없음 포함) 시 null을 반환하며 캐시하지 않는다.
 */
export async function getProfileCached(
  supabase: SupabaseClient,
  userId: string
): Promise<CachedUserProfile | null> {
  const entry = cache.get(userId);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.profile;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, linked_member_id, link_status')
    .eq('id', userId)
    .single();

  if (!profile) {
    cache.delete(userId);
    return null;
  }

  if (cache.size >= MAX_ENTRIES) {
    // 단순 전체 비우기 — LRU가 필요한 규모가 아니며 최악의 비용이 재조회 1회뿐
    cache.clear();
  }
  cache.set(userId, { profile, expiresAt: Date.now() + TTL_MS });

  return profile;
}

/**
 * 프로필 변경(역할 부여, 대원 연동 요청/승인/거절 등) 시 호출해
 * 같은 인스턴스의 캐시를 즉시 무효화한다.
 */
export function invalidateProfileCache(userId: string): void {
  cache.delete(userId);
}
