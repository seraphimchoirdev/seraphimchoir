import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

import type { PartConfirmationStatus } from '@/types/community';

const PARTS = ['SOPRANO', 'ALTO', 'TENOR', 'BASS'] as const;

/**
 * GET /api/community/posts/[id]/confirmations
 * 공지 확인 현황 (파트별)
 * - PART_LEADER: 자기 파트만
 * - MANAGER+, SECRETARY: 전체
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  // 사용자 역할 + 파트 확인
  const adminClient = await createAdminClient();
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role, linked_member:members(part)')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: '프로필을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  const managerRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY'];
  const isManager = managerRoles.includes(profile.role || '');
  const isPartLeader = profile.role === 'PART_LEADER';

  if (!isManager && !isPartLeader) {
    return NextResponse.json(
      { error: '확인 현황 조회 권한이 없습니다.' },
      { status: 403 }
    );
  }

  const linked = profile.linked_member as unknown as { part: string } | null;
  const userPart = linked?.part || null;

  // 전체 활동 대원 조회 (user_profiles와 연결된 멤버만)
  const { data: members } = await adminClient
    .from('members')
    .select(
      'id, name, part, user_profiles:user_profiles!linked_member_id(id)'
    )
    .in('member_status', ['REGULAR', 'TRAINEE']);

  // 확인 기록 조회
  const { data: confirmations } = await adminClient
    .from('notice_confirmations')
    .select('user_id, confirmed_at')
    .eq('post_id', postId);

  const confirmedMap = new Map(
    (confirmations || []).map((c) => [c.user_id, c.confirmed_at])
  );

  // 파트별 집계
  const result: PartConfirmationStatus[] = [];

  for (const part of PARTS) {
    // PART_LEADER는 자기 파트만
    if (isPartLeader && part !== userPart) continue;

    const partMembers = (members || []).filter((m) => {
      if (m.part !== part) return false;
      // user_profiles가 연결된 멤버만 (로그인 가능한 대원)
      const profiles = m.user_profiles as unknown as Array<{ id: string }>;
      return profiles && profiles.length > 0;
    });

    const confirmed: PartConfirmationStatus['confirmed'] = [];
    const unconfirmed: PartConfirmationStatus['unconfirmed'] = [];

    for (const member of partMembers) {
      const profiles = member.user_profiles as unknown as Array<{
        id: string;
      }>;
      const userId = profiles[0]?.id;
      if (!userId) continue;

      const confirmedAt = confirmedMap.get(userId);
      if (confirmedAt) {
        confirmed.push({
          user_id: userId,
          name: member.name,
          confirmed_at: confirmedAt,
        });
      } else {
        unconfirmed.push({ user_id: userId, name: member.name });
      }
    }

    result.push({
      part,
      confirmed,
      unconfirmed,
      total: confirmed.length + unconfirmed.length,
      confirmed_count: confirmed.length,
    });
  }

  return NextResponse.json(result);
}
