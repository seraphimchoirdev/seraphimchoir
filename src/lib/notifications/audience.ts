import 'server-only';

import { createLogger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'NotifyAudience' });

export type ManualAudience =
  | { type: 'ALL' }
  | { type: 'PART'; parts: string[] }
  | { type: 'MEMBERS'; memberIds: string[] };

/**
 * 대원 ID 목록 → 승인된 사용자 계정 매핑
 * (한 대원에 승인 프로필이 여러 개일 수 있어 배열로 관리)
 */
export async function getApprovedUserIdsByMember(
  memberIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (memberIds.length === 0) return map;

  const admin = await createAdminClient();

  const { data: profiles, error } = await admin
    .from('user_profiles')
    .select('id, linked_member_id')
    .eq('link_status', 'approved')
    .in('linked_member_id', memberIds);

  if (error) {
    logger.warn('user_profiles 조회 실패:', error.message);
    return map;
  }

  profiles?.forEach((p: { id: string; linked_member_id: string | null }) => {
    if (!p.linked_member_id) return;
    const list = map.get(p.linked_member_id) ?? [];
    list.push(p.id);
    map.set(p.linked_member_id, list);
  });
  return map;
}

/**
 * 수동 발송 대상(전체/파트/개인)을 승인된 사용자 ID 목록으로 해석
 */
export async function resolveAudienceUserIds(audience: ManualAudience): Promise<string[]> {
  const admin = await createAdminClient();

  let query = admin
    .from('members')
    .select('id')
    .in('member_status', ['REGULAR', 'NEW']);

  if (audience.type === 'PART') {
    query = query.in('part', audience.parts);
  } else if (audience.type === 'MEMBERS') {
    query = query.in('id', audience.memberIds);
  }

  const { data: members, error } = await query;
  if (error) {
    throw new Error(`대상 대원 조회 실패: ${error.message}`);
  }

  const memberIds = (members ?? []).map((m: { id: string }) => m.id);
  const userMap = await getApprovedUserIdsByMember(memberIds);

  return [...userMap.values()].flat();
}
