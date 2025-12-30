import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const bulkUpsertSchema = z.object({
  schedules: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      service_type: z.string().optional().default('주일예배'),
      hymn_name: z.string().nullable().optional(),
      offertory_performer: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    })
  ),
});

/**
 * POST /api/service-schedules/bulk
 * 예배 일정 일괄 생성/수정 (upsert)
 * 같은 날짜가 있으면 업데이트, 없으면 생성
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const json = await request.json();
    const { schedules } = bulkUpsertSchema.parse(json);

    const { data, error } = await supabase
      .from('service_schedules')
      .upsert(schedules, { onConflict: 'date' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { data, count: data.length },
      { status: 201 }
    );
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
