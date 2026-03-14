import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

const bulkUpsertSchema = z.object({
  assignments: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      prayer_names: z.string().default(''),
      gown_part: z.string().default(''),
      quarter: z.string().regex(/^\d{4}-Q[1-4]$/),
    })
  ),
});

/**
 * POST /api/prayers/bulk
 * 기도 담당 일괄 upsert (ADMIN, SECRETARY)
 */
export async function POST(request: NextRequest) {
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

  if (!profile || !['ADMIN', 'SECRETARY'].includes(profile.role || '')) {
    return NextResponse.json({ error: '기도 담당 관리 권한이 없습니다.' }, { status: 403 });
  }

  try {
    const json = await request.json();
    const { assignments } = bulkUpsertSchema.parse(json);

    const { data, error } = await supabase
      .from('prayer_assignments')
      .upsert(assignments, { onConflict: 'date' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count: data.length }, { status: 201 });
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
