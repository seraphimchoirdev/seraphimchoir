import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

const updateServiceScheduleSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  service_type: z.string().nullable().optional(),
  hymn_name: z.string().nullable().optional(),
  offertory_performer: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/service-schedules/[id]
 * 단일 예배 일정 조회
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
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
  const { id } = await params;

  const { error } = await supabase.from('service_schedules').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
