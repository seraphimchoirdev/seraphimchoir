import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

const createNewsletterSchema = z.object({
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식이 아닙니다'),
  volume: z.number().int().positive(),
  issue_number: z.number().int().positive(),
  serial_number: z.number().int().positive(),
  year_motto: z.string().optional(),
  publisher_name: z.string().optional(),
  editor_name: z.string().optional(),
  editor_weekly_name: z.string().optional(),
  announcements: z.string().optional().default(''),
  fixed_footer_text: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
});

/**
 * GET /api/newsletters
 * 소식지 목록 조회
 *
 * Query params:
 * - status: DRAFT | PUBLISHED
 * - year: 연도 필터
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const year = searchParams.get('year');

  let query = supabase
    .from('newsletters')
    .select('*', { count: 'exact' })
    .order('issue_date', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (year) {
    query = query
      .gte('issue_date', `${year}-01-01`)
      .lte('issue_date', `${year}-12-31`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, meta: { total: count } });
}

/**
 * POST /api/newsletters
 * 소식지 생성 (ADMIN, SECRETARY)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  // 권한 체크
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['ADMIN', 'SECRETARY'].includes(profile.role || '')) {
    return NextResponse.json({ error: '소식지 생성 권한이 없습니다.' }, { status: 403 });
  }

  try {
    const json = await request.json();
    const body = createNewsletterSchema.parse(json);

    const { data, error } = await supabase
      .from('newsletters')
      .insert({
        ...body,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '해당 날짜의 소식지가 이미 존재합니다.' },
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
