import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { getTestAccountPart, isTestAccount } from '@/lib/utils';

import type { Database } from '@/types/database.types';

const logger = createLogger({ prefix: 'AttendancesBatch' });

type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';

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
 * 마감된 파트 목록 조회 헬퍼 함수
 * @returns Set of closed part names
 */
async function getClosedParts(
  supabase: SupabaseClient<Database>,
  date: string
): Promise<Set<Part>> {
  const { data } = await supabase
    .from('attendance_deadlines')
    .select('part')
    .eq('date', date)
    .not('part', 'is', null);

  if (!data) return new Set();
  return new Set(data.map((d) => d.part as Part));
}

/**
 * 멤버 ID 목록에서 각 멤버의 파트 조회
 * @returns Map of member_id to part
 */
async function getMemberParts(
  supabase: SupabaseClient<Database>,
  memberIds: string[]
): Promise<Map<string, Part>> {
  const { data } = await supabase.from('members').select('id, part').in('id', memberIds);

  const map = new Map<string, Part>();
  data?.forEach((m) => map.set(m.id, m.part as Part));
  return map;
}

/**
 * 예배 일정 존재 여부 확인 헬퍼 함수
 * @returns true if service schedule exists for the date
 */
async function checkServiceScheduleExists(
  supabase: SupabaseClient<Database>,
  date: string
): Promise<boolean> {
  const { data } = await supabase.from('service_schedules').select('id').eq('date', date).single();

  return data !== null;
}

/**
 * 자리배치표 존재 여부 확인 헬퍼 함수
 * @returns true if arrangement exists for the date
 */
async function checkArrangementExists(
  supabase: SupabaseClient<Database>,
  date: string
): Promise<boolean> {
  const { data } = await supabase
    .from('arrangements')
    .select('id')
    .eq('date', date)
    .limit(1)
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
      return NextResponse.json({ error: '출석 기록 생성 권한이 없습니다' }, { status: 403 });
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
        // 실제 계정인 경우 user_profiles.linked_member_id를 통해 연결된 멤버의 파트 조회
        const { data: profileWithMember } = await supabase
          .from('user_profiles')
          .select('linked_member_id, members:linked_member_id(part)')
          .eq('id', user.id)
          .single();

        const linkedMember = profileWithMember?.members as unknown as { part: string } | null;
        if (!profileWithMember?.linked_member_id || !linkedMember) {
          return NextResponse.json(
            { error: '파트장 정보를 찾을 수 없습니다. (대원 연결 필요)' },
            { status: 403 }
          );
        }
        leaderPart = linkedMember.part;
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

    // 5. 자리배치표 존재 확인 (존재하면 ADMIN/CONDUCTOR만 수정 가능)
    const hasArrangement = await checkArrangementExists(supabase, targetDate);

    if (hasArrangement && !['ADMIN', 'CONDUCTOR'].includes(profile.role)) {
      return NextResponse.json(
        {
          error: '자리배치표가 이미 생성되어 출석을 수정할 수 없습니다.',
          hint: '출석 변경이 필요하면 파트장 단톡방에 메시지를 남겨주세요.',
        },
        { status: 403 }
      );
    }

    // 6. 파트별 마감 확인 및 필터링 (ADMIN/CONDUCTOR는 제외)
    const memberIds = validatedData.attendances.map((a) => a.member_id);
    const memberParts = await getMemberParts(supabase, memberIds);
    let attendancesToSave = validatedData.attendances;

    if (!['ADMIN', 'CONDUCTOR'].includes(profile.role)) {
      const closedParts = await getClosedParts(supabase, targetDate);

      if (closedParts.size > 0) {
        // 마감된 파트의 대원 필터링
        attendancesToSave = validatedData.attendances.filter((a) => {
          const part = memberParts.get(a.member_id);
          return part && !closedParts.has(part);
        });

        // 모든 대원이 마감된 파트에 속하는 경우 에러
        if (attendancesToSave.length === 0) {
          return NextResponse.json(
            { error: '요청한 모든 대원이 마감된 파트에 속합니다. 저장할 수 없습니다.' },
            { status: 403 }
          );
        }
      }
    }

    // 6. PART_LEADER인 경우, 요청된 모든 멤버가 본인 파트인지 검증
    if (leaderPart) {
      const invalidMembers = attendancesToSave.filter((a) => {
        const part = memberParts.get(a.member_id);
        return part !== leaderPart;
      });

      if (invalidMembers.length > 0) {
        return NextResponse.json(
          { error: '본인 파트의 대원만 출석 체크할 수 있습니다.' },
          { status: 403 }
        );
      }
    }

    // Upsert 처리 (onConflict: member_id, date)
    const { data, error } = await supabase
      .from('attendances')
      .upsert(attendancesToSave, {
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

    // 파트별 마감으로 스킵된 건수 계산
    const skippedCount = validatedData.attendances.length - attendancesToSave.length;

    // 성공 응답
    return NextResponse.json(
      {
        success: true,
        data,
        summary: {
          total: validatedData.attendances.length,
          succeeded: data?.length || 0,
          skipped: skippedCount, // 마감된 파트로 인해 스킵된 건수
          failed: attendancesToSave.length - (data?.length || 0),
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
    return NextResponse.json({ error: '출석 기록 일괄 생성에 실패했습니다' }, { status: 500 });
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
      return NextResponse.json({ error: '출석 기록 수정 권한이 없습니다' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = batchUpdateSchema.parse(body);

    // 마감 검증을 위해 기존 출석 레코드 조회
    const attendanceIds = validatedData.updates.map((u) => u.id);
    const { data: existingAttendances } = await supabase
      .from('attendances')
      .select('id, date')
      .in('id', attendanceIds);

    // 각 날짜별 전체 마감 확인
    const uniqueDates = [...new Set(existingAttendances?.map((a) => a.date) || [])];
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
    return NextResponse.json({ error: '출석 기록 일괄 수정에 실패했습니다' }, { status: 500 });
  }
}
