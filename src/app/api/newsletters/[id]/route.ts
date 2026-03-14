import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

const updateNewsletterSchema = z.object({
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  volume: z.number().int().positive().optional(),
  issue_number: z.number().int().positive().optional(),
  serial_number: z.number().int().positive().optional(),
  year_motto: z.string().nullable().optional(),
  publisher_name: z.string().nullable().optional(),
  editor_name: z.string().nullable().optional(),
  editor_weekly_name: z.string().nullable().optional(),
  announcements: z.string().nullable().optional(),
  fixed_footer_text: z.string().nullable().optional(),
});

/**
 * GET /api/newsletters/[id]
 * 소식지 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from('newsletters')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: '소식지를 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/newsletters/[id]
 * 소식지 수정 (ADMIN, SECRETARY 전체 / MANAGER는 announcements만)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['ADMIN', 'SECRETARY', 'MANAGER'].includes(profile.role || '')) {
    return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const json = await request.json();
    const body = updateNewsletterSchema.parse(json);

    // MANAGER는 announcements만 수정 가능
    if (profile.role === 'MANAGER') {
      const allowedKeys = ['announcements'];
      const keys = Object.keys(body);
      const forbidden = keys.filter(k => !allowedKeys.includes(k));
      if (forbidden.length > 0) {
        return NextResponse.json(
          { error: '총무는 알림(announcements)만 수정할 수 있습니다.' },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabase
      .from('newsletters')
      .update({ ...body, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '소식지를 찾을 수 없습니다.' }, { status: 404 });
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '해당 날짜의 소식지가 이미 존재합니다.' },
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
 * DELETE /api/newsletters/[id]
 * 소식지 삭제 (ADMIN만)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'ADMIN') {
    return NextResponse.json({ error: 'ADMIN 권한이 필요합니다.' }, { status: 403 });
  }

  const { id } = await params;

  const { error } = await supabase.from('newsletters').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
