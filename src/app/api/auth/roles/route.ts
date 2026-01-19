import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'RolesAPI' });

/**
 * PATCH /api/auth/roles
 * 사용자의 역할(role)과 직책(title)을 변경합니다.
 * ADMIN 권한이 필요합니다.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, title } = body;

    // 입력 검증 - userId는 필수, role/title은 선택
    if (!userId) {
      return NextResponse.json(
        { error: 'userId를 입력해주세요.' },
        { status: 400 }
      );
    }

    // role 유효성 검증 (role이 제공된 경우에만)
    const validRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'STAFF', 'PART_LEADER', 'MEMBER'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        {
          error: `유효하지 않은 역할입니다. 사용 가능한 역할: ${validRoles.join(', ')}`
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 현재 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 현재 사용자의 프로필 조회 (권한 확인)
    const { data: currentUserProfile, error: currentProfileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentProfileError || !currentUserProfile) {
      logger.error('Current user profile fetch error:', currentProfileError);
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // ADMIN 권한 확인
    if (currentUserProfile.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'ADMIN 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 자기 자신의 역할 변경 방지
    if (userId === user.id) {
      return NextResponse.json(
        { error: '자기 자신의 역할은 변경할 수 없습니다.' },
        { status: 400 }
      );
    }

    // Admin client를 사용하여 역할 업데이트 (RLS 우회)
    const adminClient = await createAdminClient();

    // 대상 사용자 존재 확인
    const { data: targetUser, error: targetUserError } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      logger.error('Target user fetch error:', targetUserError);
      return NextResponse.json(
        { error: '대상 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 업데이트할 필드 구성
    const updateData: { role?: string | null; title?: string | null; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    // role이 빈 문자열이면 null로, 그렇지 않으면 값 사용
    if (role !== undefined) {
      updateData.role = role || null;
    }

    // title 필드 처리
    if (title !== undefined) {
      updateData.title = title || null;
    }

    // 역할/직책 업데이트
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      logger.error('Role update error:', updateError);
      return NextResponse.json(
        { error: '역할 업데이트 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    const roleLabel = role ? `역할: ${role}` : '';
    const titleLabel = title ? `직책: ${title}` : '';
    const changeLabel = [roleLabel, titleLabel].filter(Boolean).join(', ') || '정보';

    return NextResponse.json(
      {
        profile: updatedProfile,
        message: `${targetUser.name}님의 ${changeLabel}가 변경되었습니다.`,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Update role exception:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
