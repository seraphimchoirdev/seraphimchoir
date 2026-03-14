import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/prayers
 * 기도 담당 조회
 *
 * Query params:
 * - quarter: "2026-Q1" 형태
 * - startDate & endDate: 날짜 범위
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const quarter = searchParams.get('quarter');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  let query = supabase
    .from('prayer_assignments')
    .select('*', { count: 'exact' })
    .order('date', { ascending: true });

  if (quarter) {
    query = query.eq('quarter', quarter);
  }

  if (startDate && endDate) {
    query = query.gte('date', startDate).lte('date', endDate);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, meta: { total: count } });
}
