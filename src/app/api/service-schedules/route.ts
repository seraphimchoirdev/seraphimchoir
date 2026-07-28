import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { revalidateDashboardShared } from '@/lib/dashboard-shared-cache';
import { createClient } from '@/lib/supabase/server';

// ⚠️ zod .object()는 스키마에 없는 키를 에러 없이 제거(strip)한다 —
// 클라이언트가 보내는 필드와 반드시 1:1로 유지할 것 (bulk 라우트 스키마와 동일 목록).
const createServiceScheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식이 아닙니다'),
  service_type: z.string().optional().default('주일예배'),
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
  pre_practice_minutes_before: z.number().nullable().optional(),
  post_practice_start_time: z.string().nullable().optional(),
  post_practice_duration: z.number().nullable().optional(),
  pre_practice_location: z.string().nullable().optional(),
  post_practice_location: z.string().nullable().optional(),
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

  // 인증 검사
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;

  // 쿼리 파라미터
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const quarter = searchParams.get('quarter');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const date = searchParams.get('date');

  let query = supabase
    .from('service_schedules')
    .select('*', { count: 'exact' })
    .order('date', { ascending: true })
    .order('service_start_time', { ascending: true });

  // 단일 날짜 조회
  if (date) {
    query = query.eq('date', date);
  }
  // 월별 필터링 (우선순위: month > quarter)
  else if (year && month) {
    const m = parseInt(month);
    const lastDay = new Date(parseInt(year), m, 0).getDate();
    const mStartDate = `${year}-${String(m).padStart(2, '0')}-01`;
    const mEndDate = `${year}-${String(m).padStart(2, '0')}-${lastDay}`;
    query = query.gte('date', mStartDate).lte('date', mEndDate);
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

  // 인증 검사
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    const json = await request.json();
    const body = createServiceScheduleSchema.parse(json);

    // 스키마 통과한 필드 전체를 insert (개별 나열로 인한 필드 누락 재발 방지)
    const { data, error } = await supabase
      .from('service_schedules')
      .insert(body)
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

    revalidateDashboardShared();
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
