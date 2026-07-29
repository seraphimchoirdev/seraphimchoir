import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { revalidateDashboardShared } from '@/lib/dashboard-shared-cache';
import { createClient } from '@/lib/supabase/server';

// ⚠️ zod .object()는 스키마에 없는 키를 에러 없이 제거(strip)한다.
// 과거 composer/music_source 등이 여기 빠져 있어 "성공 토스트는 뜨지만
// 저장은 안 되는" 버그가 있었음 — 클라이언트(ServiceScheduleDialog)가 보내는
// 필드와 반드시 1:1로 유지할 것 (bulk 라우트 스키마와 동일 목록).
const updateServiceScheduleSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  service_type: z.string().nullable().optional(),
  // TIME 컬럼은 '09:00:00' 형태로 오갈 수 있어 초 단위를 옵셔널로 허용
  service_start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, '유효한 시간 형식이 아닙니다')
    .nullable()
    .optional(),
  hymn_name: z.string().nullable().optional(),
  offertory_performer: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  // 선곡표 필드
  hood_color: z.string().nullable().optional(),
  composer: z.string().nullable().optional(),
  music_source: z.string().nullable().optional(),
  // 연습 설정 필드
  has_pre_practice: z.boolean().nullable().optional(),
  has_post_practice: z.boolean().nullable().optional(),
  // 화면이 읽는 전연습 시각. 스키마에 없으면 zod가 조용히 버려 저장되지 않는다.
  pre_practice_start_time: z.string().nullable().optional(),
  pre_practice_minutes_before: z.number().nullable().optional(),
  post_practice_start_time: z.string().nullable().optional(),
  post_practice_duration: z.number().nullable().optional(),
  pre_practice_location: z.string().nullable().optional(),
  post_practice_location: z.string().nullable().optional(),
});

/**
 * GET /api/service-schedules/[id]
 * 단일 예배 일정 조회
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();

  // 인증 검사
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from('service_schedules')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: '예배 일정을 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/service-schedules/[id]
 * 예배 일정 수정
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();

  // 인증 검사
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const json = await request.json();
    const body = updateServiceScheduleSchema.parse(json);

    const { data, error } = await supabase
      .from('service_schedules')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '예배 일정을 찾을 수 없습니다.' }, { status: 404 });
      }
      // UNIQUE 제약 위반 처리
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '해당 날짜의 예배 일정이 이미 존재합니다.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidateDashboardShared();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/service-schedules/[id]
 * 예배 일정 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  // 인증 검사
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase.from('service_schedules').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateDashboardShared();
  return NextResponse.json({ success: true });
}
