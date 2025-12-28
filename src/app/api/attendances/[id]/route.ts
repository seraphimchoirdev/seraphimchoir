import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * 전체 마감 여부 확인 헬퍼 함수
 */
async function checkFullDeadline(
  supabase: SupabaseClient<Database>,
  date: string
): Promise<boolean> {
  const { data } = await supabase
    .from('attendance_deadlines')
    .select('id')
    .eq('date', date)
    .is('part', null)
    .single();

  return data !== null;
}

// Attendance 수정 스키마
const updateAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다').optional(),
  is_service_available: z.boolean().optional(),
  is_practice_attended: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/attendances/[id]
 * 특정 출석 기록 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { data, error } = await supabase
      .from('attendances')
      .select('*, members:member_id(id, name, part)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '출석 기록을 찾을 수 없습니다' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json(
      { error: '출석 기록을 불러오는데 실패했습니다' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/attendances/[id]
 * 출석 기록 수정
 * 권한: PART_LEADER 이상
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 권한 확인 (PART_LEADER 이상)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER'];
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: '출석 기록 수정 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 마감 검증을 위해 기존 출석 레코드 조회
    const { data: existingAttendance } = await supabase
      .from('attendances')
      .select('date')
      .eq('id', id)
      .single();

    if (existingAttendance) {
      const isFullyClosed = await checkFullDeadline(supabase, existingAttendance.date);
      if (isFullyClosed && !['ADMIN', 'CONDUCTOR'].includes(profile.role)) {
        return NextResponse.json(
          { error: '전체 마감되어 수정할 수 없습니다.' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validatedData = updateAttendanceSchema.parse(body);

    const { data, error } = await supabase
      .from('attendances')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '출석 기록을 찾을 수 없습니다' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    console.error('Attendance PATCH error:', error);
    return NextResponse.json(
      { error: '출석 기록 수정에 실패했습니다' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/attendances/[id]
 * 출석 기록 삭제
 * 권한: MANAGER 이상
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 권한 확인 (MANAGER 이상)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER'];
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: '출석 기록 삭제 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 마감 검증을 위해 기존 출석 레코드 조회
    const { data: existingAttendance } = await supabase
      .from('attendances')
      .select('date')
      .eq('id', id)
      .single();

    if (existingAttendance) {
      const isFullyClosed = await checkFullDeadline(supabase, existingAttendance.date);
      if (isFullyClosed && !['ADMIN', 'CONDUCTOR'].includes(profile.role)) {
        return NextResponse.json(
          { error: '전체 마감되어 삭제할 수 없습니다.' },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase
      .from('attendances')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: '출석 기록이 삭제되었습니다' });
  } catch (error) {
    console.error('Attendance DELETE error:', error);
    return NextResponse.json(
      { error: '출석 기록 삭제에 실패했습니다' },
      { status: 500 }
    );
  }
}
