import { NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'MyProfile' });

/**
 * GET /api/my-profile
 * 현재 사용자의 프로필 및 연결된 대원 정보 조회
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 프로필 및 연결된 대원 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(
        `
        id,
        email,
        name,
        role,
        linked_member_id,
        link_status,
        member:members!user_profiles_linked_member_id_fkey(
          id,
          name,
          part,
          height_cm,
          regular_member_since
        )
      `
      )
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error('프로필 조회 실패:', profileError);
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    // member 배열 또는 단일 객체를 처리
    const memberData = profile?.member;
    const member = memberData ? (Array.isArray(memberData) ? memberData[0] : memberData) : null;

    // 최근 출석 정보 조회 (member_last_attendance 뷰)
    let attendanceInfo = null;
    if (member?.id) {
      const { data: attendance } = await supabase
        .from('member_last_attendance')
        .select('last_service_date, last_practice_date')
        .eq('member_id', member.id)
        .single();

      attendanceInfo = attendance;
    }

    return NextResponse.json({
      ...profile,
      member: member
        ? {
            ...member,
            last_service_date: attendanceInfo?.last_service_date || null,
            last_practice_date: attendanceInfo?.last_practice_date || null,
          }
        : null,
    });
  } catch (error) {
    logger.error('프로필 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * PATCH /api/my-profile
 * 연결된 대원의 키, 정대원 임명일 수정
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 현재 사용자의 연결된 대원 확인
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('linked_member_id, link_status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (profile.link_status !== 'approved' || !profile.linked_member_id) {
      return NextResponse.json({ error: '연결된 대원이 없습니다.' }, { status: 400 });
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { height_cm, regular_member_since } = body;

    // 업데이트할 필드 구성
    const updateData: { height_cm?: number; regular_member_since?: string | null } = {};

    // 키 검증
    if (height_cm !== undefined) {
      if (typeof height_cm !== 'number' || height_cm < 100 || height_cm > 250) {
        return NextResponse.json(
          { error: '키는 100cm ~ 250cm 사이의 숫자로 입력해주세요.' },
          { status: 400 }
        );
      }
      updateData.height_cm = height_cm;
    }

    // 정대원 임명일 검증
    if (regular_member_since !== undefined) {
      if (regular_member_since === null || regular_member_since === '') {
        updateData.regular_member_since = null;
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(regular_member_since)) {
        return NextResponse.json(
          { error: '정대원 임명일은 YYYY-MM-DD 형식이어야 합니다.' },
          { status: 400 }
        );
      } else {
        updateData.regular_member_since = regular_member_since;
      }
    }

    // 업데이트할 내용이 없으면 에러
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '수정할 내용이 없습니다.' }, { status: 400 });
    }

    // 대원 정보 업데이트
    const { error: updateError } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', profile.linked_member_id);

    if (updateError) {
      logger.error('대원 정보 업데이트 실패:', updateError);
      return NextResponse.json({ error: '정보 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '정보가 수정되었습니다.',
    });
  } catch (error) {
    logger.error('프로필 수정 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
