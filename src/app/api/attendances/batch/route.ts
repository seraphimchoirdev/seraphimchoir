import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { createLogger } from '@/lib/logger';
import { isTestAccount, getTestAccountPart } from '@/lib/utils';

const logger = createLogger({ prefix: 'AttendancesBatch' });

/**
 * 전체 마감 여부 확인 헬퍼 함수
 * @returns true if full deadline exists for the date
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

/**
 * 예배 일정 존재 여부 확인 헬퍼 함수
 * @returns true if service schedule exists for the date
 */
async function checkServiceScheduleExists(
  supabase: SupabaseClient<Database>,
  date: string
): Promise<boolean> {
  const { data } = await supabase
    .from('service_schedules')
    .select('id')
    .eq('date', date)
    .single();

  return data !== null;
}

// 단일 출석 기록 스키마
const attendanceItemSchema = z.object({
  member_id: z.string().uuid('유효한 찬양대원 ID를 입력해주세요'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다'),
  is_service_available: z.boolean().default(true),
  is_practice_attended: z.boolean().default(true),
  notes: z.string().nullable().optional(),
});

// Batch 요청 스키마
const batchAttendanceSchema = z.object({
  attendances: z
    .array(attendanceItemSchema)
    .min(1, '최소 1개 이상의 출석 기록이 필요합니다')
    .max(100, '한 번에 최대 100개까지 처리할 수 있습니다'),
});

/**
 * POST /api/attendances/batch
 * 출석 기록 일괄 생성 (Batch Insert)
 * 권한: PART_LEADER 이상
 *
 * Request Body:
 * {
 *   attendances: [
 *     { member_id: "uuid", date: "2024-01-01", is_available: true, notes: null },
 *     { member_id: "uuid", date: "2024-01-01", is_available: false, notes: "결석" },
 *     ...
 *   ]
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: [...],
 *   summary: {
 *     total: 10,
 *     succeeded: 8,
 *     failed: 2,
 *     errors: [...]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 권한 및 파트 확인
    // 1. user_profiles에서 role 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER'];
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: '출석 기록 생성 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 2. PART_LEADER인 경우, members 테이블에서 본인의 파트 확인
    let leaderPart: string | null = null;
    if (profile.role === 'PART_LEADER') {
      // 테스트 계정인 경우 이메일에서 파트 추출
      if (isTestAccount(user.email)) {
        leaderPart = getTestAccountPart(user.email);
        if (!leaderPart) {
          return NextResponse.json(
            { error: '테스트 파트장 계정의 파트를 확인할 수 없습니다.' },
            { status: 403 }
          );
        }
      } else {
        // 실제 계정인 경우 members 테이블에서 조회
        const { data: member } = await supabase
          .from('members')
          .select('part')
          .eq('email', user.email)
          .single();

        if (!member) {
          return NextResponse.json(
            { error: '파트장 정보를 찾을 수 없습니다. (멤버 등록 필요)' },
            { status: 403 }
          );
        }
        leaderPart = member.part;
      }
    }

    const body = await request.json();
    const validatedData = batchAttendanceSchema.parse(body);

    // 3. 예배 일정 존재 확인
    // 모든 출석 기록의 날짜가 동일하다고 가정 (BulkAttendanceForm에서 단일 날짜로 제출)
    const targetDate = validatedData.attendances[0].date;
    const hasServiceSchedule = await checkServiceScheduleExists(supabase, targetDate);

    if (!hasServiceSchedule) {
      return NextResponse.json(
        { error: '해당 날짜에 등록된 예배 일정이 없습니다. 먼저 예배 일정을 등록해주세요.' },
        { status: 400 }
      );
    }

    // 4. 전체 마감 확인 (마감된 경우 ADMIN/CONDUCTOR만 수정 가능)
    const isFullyClosed = await checkFullDeadline(supabase, targetDate);

    if (isFullyClosed && !['ADMIN', 'CONDUCTOR'].includes(profile.role)) {
      return NextResponse.json(
        { error: '전체 마감되어 수정할 수 없습니다. CONDUCTOR 또는 ADMIN에게 문의하세요.' },
        { status: 403 }
      );
    }

    // 5. PART_LEADER인 경우, 요청된 모든 멤버가 본인 파트인지 검증
    if (leaderPart) {
      const memberIds = validatedData.attendances.map(a => a.member_id);
      const { data: targetMembers } = await supabase
        .from('members')
        .select('id, part')
        .in('id', memberIds);

      const invalidMembers = targetMembers?.filter(m => m.part !== leaderPart);
      if (invalidMembers && invalidMembers.length > 0) {
        return NextResponse.json(
          { error: '본인 파트의 대원만 출석 체크할 수 있습니다.' },
          { status: 403 }
        );
      }
    }

    // Upsert 처리 (onConflict: member_id, date)
    const { data, error } = await supabase
      .from('attendances')
      .upsert(validatedData.attendances, {
        onConflict: 'member_id, date',
        ignoreDuplicates: false, // 업데이트 허용
      })
      .select();

    if (error) {
      logger.error('Supabase batch upsert error:', error);
      return NextResponse.json(
        {
          error: '출석 기록 저장에 실패했습니다',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // 성공 응답
    return NextResponse.json(
      {
        success: true,
        data,
        summary: {
          total: validatedData.attendances.length,
          succeeded: data?.length || 0,
          failed: validatedData.attendances.length - (data?.length || 0),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: '입력 데이터가 유효하지 않습니다',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    logger.error('Batch attendances POST error:', error);
    return NextResponse.json(
      { error: '출석 기록 일괄 생성에 실패했습니다' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/attendances/batch
 * 출석 기록 일괄 업데이트
 * 권한: PART_LEADER 이상
 *
 * Request Body:
 * {
 *   updates: [
 *     { id: "uuid", is_available: true, notes: "변경" },
 *     { id: "uuid", is_available: false },
 *     ...
 *   ]
 * }
 */
const updateItemSchema = z.object({
  id: z.string().uuid('유효한 출석 ID를 입력해주세요'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다')
    .optional(),
  is_service_available: z.boolean().optional(),
  is_practice_attended: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

const batchUpdateSchema = z.object({
  updates: z
    .array(updateItemSchema)
    .min(1, '최소 1개 이상의 업데이트가 필요합니다')
    .max(100, '한 번에 최대 100개까지 처리할 수 있습니다'),
});

export async function PATCH(request: NextRequest) {
  try {
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

    const body = await request.json();
    const validatedData = batchUpdateSchema.parse(body);

    // 마감 검증을 위해 기존 출석 레코드 조회
    const attendanceIds = validatedData.updates.map(u => u.id);
    const { data: existingAttendances } = await supabase
      .from('attendances')
      .select('id, date')
      .in('id', attendanceIds);

    // 각 날짜별 전체 마감 확인
    const uniqueDates = [...new Set(existingAttendances?.map(a => a.date) || [])];
    for (const date of uniqueDates) {
      const isFullyClosed = await checkFullDeadline(supabase, date);
      if (isFullyClosed && !['ADMIN', 'CONDUCTOR'].includes(profile.role)) {
        return NextResponse.json(
          { error: `${date} 날짜가 전체 마감되어 수정할 수 없습니다.` },
          { status: 403 }
        );
      }
    }

    // 각 업데이트를 병렬로 처리
    const updatePromises = validatedData.updates.map(async ({ id, ...updateData }) => {
      const { data, error } = await supabase
        .from('attendances')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      return { id, data, error };
    });

    const results = await Promise.allSettled(updatePromises);

    // 결과 분석
    const succeeded: Array<{ id: string; data: unknown }> = [];
    const failed: Array<{ id: string; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { data, error } = result.value;
        if (error) {
          failed.push({
            id: validatedData.updates[index].id,
            error: error.message,
          });
        } else if (data) {
          succeeded.push(data);
        }
      } else {
        failed.push({
          id: validatedData.updates[index].id,
          error: result.reason?.message || '알 수 없는 오류',
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: succeeded,
      summary: {
        total: validatedData.updates.length,
        succeeded: succeeded.length,
        failed: failed.length,
      },
      errors: failed.length > 0 ? failed : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: '입력 데이터가 유효하지 않습니다',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    logger.error('Batch attendances PATCH error:', error);
    return NextResponse.json(
      { error: '출석 기록 일괄 수정에 실패했습니다' },
      { status: 500 }
    );
  }
}
