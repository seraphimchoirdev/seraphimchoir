import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/member-link/[userId]
 * 대원 연결 승인/거부 (파트장/관리자용)
 *
 * Body: { action: 'approve' | 'reject' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const { userId } = await params;

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 현재 사용자 권한 확인
    const { data: currentProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, linked_member_id')
      .eq('id', user.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        { error: '프로필을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인 (PART_LEADER 이상)
    const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER'];
    if (!currentProfile.role || !allowedRoles.includes(currentProfile.role)) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { action } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action은 approve 또는 reject여야 합니다.' },
        { status: 400 }
      );
    }

    // 대상 사용자 프로필 조회
    const { data: targetProfile, error: targetError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        linked_member_id,
        link_status,
        member:members!user_profiles_linked_member_id_fkey(
          id,
          name,
          part
        )
      `)
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json(
        { error: '대상 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 대기중인 요청만 처리 가능
    if (targetProfile.link_status !== 'pending') {
      return NextResponse.json(
        { error: '대기중인 요청만 처리할 수 있습니다.' },
        { status: 400 }
      );
    }

    // PART_LEADER는 자기 파트만 승인 가능
    if (currentProfile.role === 'PART_LEADER') {
      // 현재 사용자의 파트 조회
      const { data: currentMember } = await supabase
        .from('members')
        .select('part')
        .eq('id', currentProfile.linked_member_id)
        .single();

      // member는 단일 객체 또는 배열일 수 있음
      const memberData = targetProfile.member;
      const targetMember = Array.isArray(memberData) ? memberData[0] : memberData;

      if (!currentMember || !targetMember || currentMember.part !== targetMember.part) {
        return NextResponse.json(
          { error: '다른 파트의 연결 요청은 처리할 수 없습니다.' },
          { status: 403 }
        );
      }
    }

    // 승인 또는 거부 처리
    if (action === 'approve') {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          link_status: 'approved',
          link_approved_by: user.id,
          link_approved_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('승인 처리 실패:', updateError);
        return NextResponse.json(
          { error: '승인 처리에 실패했습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '연결이 승인되었습니다.',
      });
    } else {
      // 거부: linked_member_id 초기화
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          linked_member_id: null,
          link_status: 'rejected',
          link_approved_by: user.id,
          link_approved_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('거부 처리 실패:', updateError);
        return NextResponse.json(
          { error: '거부 처리에 실패했습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '연결이 거부되었습니다.',
      });
    }
  } catch (error) {
    console.error('Member link action error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
