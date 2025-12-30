import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createServiceScheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식이 아닙니다'),
  service_type: z.string().optional().default('주일예배'),
  hymn_name: z.string().optional(),
  offertory_performer: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/service-schedules
 * 예배 일정 목록 조회
 *
 * Query params:
 * - year & quarter: 분기별 조회 (예: ?year=2025&quarter=1)
 * - startDate & endDate: 날짜 범위 조회
 * - date: 특정 날짜 조회
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // 쿼리 파라미터
  const year = searchParams.get('year');
  const quarter = searchParams.get('quarter');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const date = searchParams.get('date');

  let query = supabase
    .from('service_schedules')
    .select('*', { count: 'exact' })
    .order('date', { ascending: true });

  // 단일 날짜 조회
  if (date) {
    query = query.eq('date', date);
  }
  // 분기 필터링
  else if (year && quarter) {
    const q = parseInt(quarter);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = q * 3;
    const lastDay = new Date(parseInt(year), endMonth, 0).getDate();
    const qStartDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
    const qEndDate = `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`;
    query = query.gte('date', qStartDate).lte('date', qEndDate);
  }
  // 날짜 범위 필터링
  else if (startDate && endDate) {
    query = query.gte('date', startDate).lte('date', endDate);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, meta: { total: count } });
}

/**
 * POST /api/service-schedules
 * 예배 일정 생성
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const json = await request.json();
    const body = createServiceScheduleSchema.parse(json);

    const { data, error } = await supabase
      .from('service_schedules')
      .insert({
        date: body.date,
        service_type: body.service_type,
        hymn_name: body.hymn_name,
        offertory_performer: body.offertory_performer,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      // UNIQUE 제약 위반 처리 (같은 날짜에 이미 일정이 있는 경우)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '해당 날짜의 예배 일정이 이미 존재합니다.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
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
