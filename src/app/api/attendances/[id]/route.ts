import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { validateMemberSelfVote } from '@/lib/attendance-vote-guard';
import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const logger = createLogger({ prefix: 'AttendanceDetailAPI' });

// Attendance 수정 스키마
const updateAttendanceSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다')
    .optional(),
  service_schedule_id: z.string().uuid().optional(),
  is_service_available: z.boolean().optional(),
  is_practice_attended: z.boolean().optional(),
  practice_status: z.enum(['FULL', 'EARLY_LEAVE', 'LATE_JOIN', 'ABSENT']).nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/attendances/[id]
 * 특정 출석 기록 조회
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      logger.error('Supabase error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '출석 기록을 찾을 수 없습니다' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Attendance GET error:', error);
    return NextResponse.json({ error: '출석 기록을 불러오는데 실패했습니다' }, { status: 500 });
  }
}

/**
 * PATCH /api/attendances/[id]
 * 출석 기록 수정
 * 권한: PART_LEADER 이상
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // MEMBER는 본인 투표용으로 허용 (본인 레코드 + 마감 검증은 아래 가드에서)
    const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER', 'MEMBER'];
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: '출석 기록 수정 권한이 없습니다' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateAttendanceSchema.parse(body);

    // 일반 대원: 본인 레코드만 + 마감 전에만 (변경하려는 필드만 검증)
    if (profile.role === 'MEMBER') {
      const { data: existing } = await supabase
        .from('attendances')
        .select('member_id, date, service_schedule_id')
        .eq('id', id)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ error: '출석 기록을 찾을 수 없습니다' }, { status: 404 });
      }

      const guard = await validateMemberSelfVote(supabase, user.id, {
        memberId: existing.member_id,
        date: existing.date,
        serviceScheduleId: existing.service_schedule_id,
        votesService: validatedData.is_service_available !== undefined,
        votesPractice:
          validatedData.practice_status !== undefined ||
          validatedData.is_practice_attended !== undefined,
      });
      if (!guard.ok) {
        return NextResponse.json({ error: guard.error }, { status: guard.status });
      }
    }

    const { data, error } = await supabase
      .from('attendances')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Supabase error:', error);
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

    logger.error('Attendance PATCH error:', error);
    return NextResponse.json({ error: '출석 기록 수정에 실패했습니다' }, { status: 500 });
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
      return NextResponse.json({ error: '출석 기록 삭제 권한이 없습니다' }, { status: 403 });
    }

    const { error } = await supabase.from('attendances').delete().eq('id', id);

    if (error) {
      logger.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: '출석 기록이 삭제되었습니다' });
  } catch (error) {
    logger.error('Attendance DELETE error:', error);
    return NextResponse.json({ error: '출석 기록 삭제에 실패했습니다' }, { status: 500 });
  }
}
