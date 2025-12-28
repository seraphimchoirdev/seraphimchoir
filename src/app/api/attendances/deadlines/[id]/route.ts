import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    // 마감 레코드 삭제
    const { error } = await supabase
      .from('attendance_deadlines')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '마감이 해제되었습니다' });
  } catch (error) {
    console.error('Deadline DELETE error:', error);
    return NextResponse.json(
      { error: '마감 해제에 실패했습니다' },
      { status: 500 }
    );
  }
}
