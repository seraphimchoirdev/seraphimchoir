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
      // 신규 필드 (이미지 OCR 파싱용)
      hood_color: z.string().nullable().optional(),
      composer: z.string().nullable().optional(),
      music_source: z.string().nullable().optional(),
      // 연습 관련 필드
      has_pre_practice: z.boolean().nullable().optional(),
      has_post_practice: z.boolean().nullable().optional(),
      pre_practice_minutes_before: z.number().nullable().optional(),
      post_practice_start_time: z.string().nullable().optional(),
      post_practice_duration: z.number().nullable().optional(),
      pre_practice_location: z.string().nullable().optional(),
      post_practice_location: z.string().nullable().optional(),
    })
  ),
});

/**
 * POST /api/service-schedules/bulk
 * 예배 일정 일괄 생성/수정 (upsert)
 * 같은 날짜 + 예배 유형이 있으면 업데이트, 없으면 생성
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const json = await request.json();
    const { schedules } = bulkUpsertSchema.parse(json);

    // onConflict: 'date,service_type' - 같은 날짜에 다른 예배 유형은 별도 저장
    const { data, error } = await supabase
      .from('service_schedules')
      .upsert(schedules, { onConflict: 'date,service_type' })
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
