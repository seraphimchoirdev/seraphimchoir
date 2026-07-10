import { NextRequest, NextResponse } from 'next/server';

import {
  POLL_SENIOR_STAFF_ROLES,
  POLL_STAFF_AUDIENCE_ROLES,
  SELECTABLE_PARTS,
} from '@/lib/community/poll-constants';
import { createAdminClient, createClient } from '@/lib/supabase/server';

import type { PollAudienceGroupStatus } from '@/types/community';

/**
 * GET /api/community/polls/[id]/audience-status
 * 설문 대상자의 응답/미응답 현황 (공지 확인 현황과 대칭 구조)
 *
 * 권한:
 * - 상위 운영진(ADMIN/CONDUCTOR/MANAGER/SECRETARY/TREASURER): 전체 파트
 * - PART_LEADER: 자기 파트만 (STAFF 대상 설문은 조회 불가)
 * - 익명 설문: 403 — 미응답자 명단이 응답자를 역산 가능하게 하므로 제공하지 않음
 *
 * 대상 모집단 (audience_type별):
 * - ALL/PART: member_status='REGULAR' AND is_singer=true + 승인된 프로필 연결 대원
 * - STAFF: 운영진 역할(user_profiles.role) 기준 단일 그룹
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  // 설문 조회 (polls RLS 적용 — 대상이 아니면 404)
  const { data: poll } = await supabase
    .from('polls')
    .select('id, title, audience_type, target_parts, is_anonymous, is_deleted')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!poll) {
    return NextResponse.json(
      { error: '설문을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  if (poll.is_anonymous) {
    return NextResponse.json(
      { error: '익명 설문은 응답자 현황을 제공하지 않습니다.' },
      { status: 403 }
    );
  }

  const adminClient = await createAdminClient();
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role, linked_member:members(part)')
    .eq('id', user.id)
    .single();

  const role = profile?.role || '';
  const isSeniorStaff = POLL_SENIOR_STAFF_ROLES.includes(role);
  const isPartLeader = role === 'PART_LEADER';

  if (!isSeniorStaff && !isPartLeader) {
    return NextResponse.json(
      { error: '응답 현황 조회 권한이 없습니다.' },
      { status: 403 }
    );
  }

  // 응답자 조회 (사용자별 최초 응답 시각)
  const { data: responses } = await adminClient
    .from('poll_responses')
    .select('user_id, created_at')
    .eq('poll_id', id)
    .order('created_at');

  const respondedMap = new Map<string, string | null>();
  for (const r of responses ?? []) {
    if (!respondedMap.has(r.user_id)) respondedMap.set(r.user_id, r.created_at);
  }

  // ===== STAFF 대상 설문: 파트 개념이 없는 단일 그룹 =====
  if (poll.audience_type === 'STAFF') {
    // 파트장에게는 임원 전체의 응답 여부를 노출하지 않음
    if (!isSeniorStaff) {
      return NextResponse.json(
        { error: '임원 대상 설문의 현황은 운영진만 조회할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { data: staffProfiles } = await adminClient
      .from('user_profiles')
      .select('id, name, role')
      .in('role', POLL_STAFF_AUDIENCE_ROLES);

    const responded: PollAudienceGroupStatus['responded'] = [];
    const notResponded: PollAudienceGroupStatus['not_responded'] = [];
    for (const s of staffProfiles ?? []) {
      if (respondedMap.has(s.id)) {
        responded.push({
          user_id: s.id,
          name: s.name || '알 수 없음',
          responded_at: respondedMap.get(s.id) ?? null,
        });
      } else {
        notResponded.push({ user_id: s.id, name: s.name || '알 수 없음' });
      }
    }

    const group: PollAudienceGroupStatus = {
      group: 'STAFF',
      responded,
      not_responded: notResponded,
      total: responded.length + notResponded.length,
      responded_count: responded.length,
    };
    return NextResponse.json({ data: [group], poll_title: poll.title });
  }

  // ===== ALL / PART 대상 설문: 파트별 그룹 =====
  let parts: string[] =
    poll.audience_type === 'PART'
      ? ((poll.target_parts ?? []) as string[])
      : [...SELECTABLE_PARTS];

  // 파트장은 자기 파트만
  if (isPartLeader) {
    const myPart = (
      profile?.linked_member as unknown as { part: string } | null
    )?.part;
    parts = parts.filter((p) => p === myPart);
    if (parts.length === 0) {
      return NextResponse.json(
        { error: '이 설문의 대상에 내 파트가 포함되어 있지 않습니다.' },
        { status: 403 }
      );
    }
  }

  // 활동 대원 + 승인된 프로필 연결 (로그인 가능해야 응답 가능)
  // 주의: 기획 표준 기준 사용 — member_status='REGULAR' AND is_singer=true
  const { data: members } = await adminClient
    .from('members')
    .select(
      'id, name, part, user_profiles:user_profiles!linked_member_id(id, link_status)'
    )
    .eq('member_status', 'REGULAR')
    .eq('is_singer', true)
    .in('part', parts);

  const groups: PollAudienceGroupStatus[] = [];

  for (const part of parts) {
    const responded: PollAudienceGroupStatus['responded'] = [];
    const notResponded: PollAudienceGroupStatus['not_responded'] = [];

    for (const member of (members ?? []).filter((m) => m.part === part)) {
      const profiles = member.user_profiles as unknown as Array<{
        id: string;
        link_status: string | null;
      }>;
      // 한 대원에 승인된 프로필이 여러 개일 수 있으므로(테스트 계정 등)
      // 그중 하나라도 응답했으면 응답으로 집계한다
      const approvedProfiles = (profiles ?? []).filter(
        (p) => p.link_status === 'approved'
      );
      if (approvedProfiles.length === 0) continue;

      const respondedProfile = approvedProfiles.find((p) =>
        respondedMap.has(p.id)
      );
      if (respondedProfile) {
        responded.push({
          user_id: respondedProfile.id,
          name: member.name,
          responded_at: respondedMap.get(respondedProfile.id) ?? null,
        });
      } else {
        notResponded.push({
          user_id: approvedProfiles[0].id,
          name: member.name,
        });
      }
    }

    groups.push({
      group: part,
      responded,
      not_responded: notResponded,
      total: responded.length + notResponded.length,
      responded_count: responded.length,
    });
  }

  return NextResponse.json({ data: groups, poll_title: poll.title });
}
