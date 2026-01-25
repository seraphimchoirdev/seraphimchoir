import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'AttendanceDeadlines' });

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/attendances/deadlines/[id]
 * 마감 해제
 * 권한: CONDUCTOR/ADMIN만 가능
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

    // 권한 확인 (CONDUCTOR/ADMIN만)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile?.role || !['ADMIN', 'CONDUCTOR'].includes(profile.role)) {
      return NextResponse.json(
        { error: '마감 해제 권한이 없습니다. CONDUCTOR 또는 ADMIN만 마감을 해제할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 마감 레코드 조회 (날짜 확인용)
    const { data: deadline } = await supabase
      .from('attendance_deadlines')
      .select('date')
      .eq('id', id)
      .single();

    if (!deadline) {
      return NextResponse.json(
        { error: '해당 마감 레코드를 찾을 수 없습니다' },
        { status: 404 }
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
          error: '자리배치표가 이미 생성되어 마감을 해제할 수 없습니다.',
          details: `배치표: ${arrangement.name}`,
          hint: '출석 변경이 필요하면 파트장 단톡방에 메시지를 남겨주세요.'
        },
        { status: 409 } // Conflict
      );
    }

    // 마감 레코드 삭제
    const { error } = await supabase
      .from('attendance_deadlines')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '마감이 해제되었습니다' });
  } catch (error) {
    logger.error('Deadline DELETE error:', error);
    return NextResponse.json(
      { error: '마감 해제에 실패했습니다' },
      { status: 500 }
    );
  }
}
