import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/newsletters/latest
 * 최근 소식지 메타정보 (자동 채움용)
 * ADMIN, SECRETARY만 접근 가능
 */
export async function GET() {
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
    return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('newsletters')
    .select('volume, issue_number, serial_number, year_motto, publisher_name, editor_name, editor_weekly_name, fixed_footer_text, issue_date')
    .order('issue_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
