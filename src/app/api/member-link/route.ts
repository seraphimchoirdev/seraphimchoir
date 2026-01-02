import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/member-link
 * 대원 연결 요청 생성
 *
 * Body: { member_id: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { member_id } = body;

    if (!member_id) {
      return NextResponse.json(
        { error: 'member_id가 필요합니다.' },
        { status: 400 }
      );
    }

    // 대원 존재 여부 확인
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, part, member_status')
      .eq('id', member_id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: '존재하지 않는 대원입니다.' },
        { status: 404 }
      );
    }

    // 정대원만 연결 가능
    if (member.member_status !== 'REGULAR') {
      return NextResponse.json(
        { error: '정대원만 연결할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 이미 다른 사용자에게 연결되어 있는지 확인
    const { data: existingLink } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('linked_member_id', member_id)
      .eq('link_status', 'approved')
      .single();

    if (existingLink) {
      return NextResponse.json(
        { error: '이미 다른 계정에 연결된 대원입니다.' },
        { status: 400 }
      );
    }

    // 현재 사용자의 프로필 확인
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('linked_member_id, link_status')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: '프로필을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이미 연결되었거나 대기중인 경우
    if (profile.link_status === 'approved') {
      return NextResponse.json(
        { error: '이미 대원에 연결되어 있습니다.' },
        { status: 400 }
      );
    }

    if (profile.link_status === 'pending') {
      return NextResponse.json(
        { error: '이미 연결 요청이 대기중입니다.' },
        { status: 400 }
      );
    }

    // 연결 요청 생성
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        linked_member_id: member_id,
        link_status: 'pending',
        link_requested_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('연결 요청 생성 실패:', updateError);
      return NextResponse.json(
        { error: '연결 요청 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '연결 요청이 생성되었습니다. 파트장의 승인을 기다려주세요.',
      member: {
        id: member.id,
        name: member.name,
        part: member.part,
      },
    });
  } catch (error) {
    console.error('Member link request error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/member-link
 * 내 연결 상태 조회
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 프로필 및 연결된 대원 정보 조회
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        linked_member_id,
        link_status,
        link_requested_at,
        member:members!user_profiles_linked_member_id_fkey(
          id,
          name,
          part
        )
      `)
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: '프로필을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get link status error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
