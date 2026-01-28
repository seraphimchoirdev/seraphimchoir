import { NextResponse } from 'next/server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

export interface PendingApproval {
  userId: string;
  userName: string;
  userEmail: string;
  requestedMemberId: string;
  requestedMemberName: string;
  requestedMemberPart: string;
  requestedAt: string;
}

export interface PendingApprovalsResponse {
  pendingApprovals: PendingApproval[];
  totalCount: number;
}

/**
 * 대기 중인 승인 건 조회 API (ADMIN 전용)
 *
 * 대원 연결 요청 중 승인 대기 상태인 건을 반환합니다.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 현재 사용자 역할 확인
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // ADMIN만 접근 가능
    if (currentProfile?.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const adminSupabase = await createAdminClient();

    // 승인 대기 중인 연결 요청 조회
    const { data: pendingProfiles, error: profilesError } = await adminSupabase
      .from('user_profiles')
      .select(
        `
        id,
        name,
        email,
        linked_member_id,
        link_requested_at
      `
      )
      .eq('link_status', 'pending')
      .not('linked_member_id', 'is', null)
      .order('link_requested_at', { ascending: true });

    if (profilesError) throw profilesError;

    // 연결 요청된 대원 정보 조회
    const memberIds = pendingProfiles?.map((p) => p.linked_member_id).filter(Boolean) || [];
    let membersMap: Map<string, { name: string; part: string }> = new Map();

    if (memberIds.length > 0) {
      const { data: members } = await adminSupabase
        .from('members')
        .select('id, name, part')
        .in('id', memberIds);

      if (members) {
        membersMap = new Map(members.map((m) => [m.id, { name: m.name, part: m.part }]));
      }
    }

    // 응답 데이터 구성
    const pendingApprovals: PendingApproval[] =
      pendingProfiles?.map((profile) => {
        const member = membersMap.get(profile.linked_member_id!);
        return {
          userId: profile.id,
          userName: profile.name,
          userEmail: profile.email,
          requestedMemberId: profile.linked_member_id!,
          requestedMemberName: member?.name || '알 수 없음',
          requestedMemberPart: member?.part || '',
          requestedAt: profile.link_requested_at || '',
        };
      }) || [];

    const response: PendingApprovalsResponse = {
      pendingApprovals,
      totalCount: pendingApprovals.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Pending Approvals Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
