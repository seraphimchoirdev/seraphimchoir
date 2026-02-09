import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'AttendanceDeadlines' });

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/attendances/deadlines/[id]
 * 준비 완료 해제
 * 권한: ADMIN/CONDUCTOR는 모든 레코드, PART_LEADER는 본인이 마크한 레코드만
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 권한 확인 (ADMIN/CONDUCTOR/PART_LEADER)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['ADMIN', 'CONDUCTOR', 'PART_LEADER'];
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: '준비 완료 해제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 준비 완료 레코드 조회
    const { data: deadline } = await supabase
      .from('attendance_deadlines')
      .select('date, part, closed_by')
      .eq('id', id)
      .single();

    if (!deadline) {
      return NextResponse.json({ error: '해당 준비 완료 레코드를 찾을 수 없습니다' }, { status: 404 });
    }

    // PART_LEADER인 경우 본인이 마크한 레코드만 해제 가능
    if (profile.role === 'PART_LEADER' && deadline.closed_by !== user.id) {
      return NextResponse.json(
        { error: '본인이 표시한 준비 완료만 해제할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 해당 날짜에 자리배치표가 존재하는지 확인
    const { data: arrangement } = await supabase
      .from('arrangements')
      .select('id, name')
      .eq('date', deadline.date)
      .limit(1)
      .single();

    if (arrangement) {
      return NextResponse.json(
        {
          error: '자리배치표가 이미 생성되어 준비 완료를 해제할 수 없습니다.',
          details: `배치표: ${arrangement.name}`,
          hint: '출석 변경이 필요하면 파트장 단톡방에 메시지를 남겨주세요.',
        },
        { status: 409 } // Conflict
      );
    }

    // 준비 완료 레코드 삭제 (adminClient로 RLS 우회 — 권한은 위에서 이미 검증)
    const adminClient = await createAdminClient();
    const { error } = await adminClient.from('attendance_deadlines').delete().eq('id', id);

    if (error) {
      logger.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '준비 완료가 해제되었습니다' });
  } catch (error) {
    logger.error('Deadline DELETE error:', error);
    return NextResponse.json({ error: '준비 완료 해제에 실패했습니다' }, { status: 500 });
  }
}
