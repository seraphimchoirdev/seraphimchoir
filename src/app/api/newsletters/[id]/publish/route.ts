import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/newsletters/[id]/publish
 * 소식지 발행 (ADMIN, SECRETARY)
 * DRAFT → PUBLISHED 상태 전환 + published_at 기록
 */
export async function POST(
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

  if (!profile || !['ADMIN', 'SECRETARY'].includes(profile.role || '')) {
    return NextResponse.json({ error: '발행 권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;

  // 현재 상태 확인
  const { data: newsletter, error: fetchError } = await supabase
    .from('newsletters')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError || !newsletter) {
    return NextResponse.json({ error: '소식지를 찾을 수 없습니다.' }, { status: 404 });
  }

  if (newsletter.status === 'PUBLISHED') {
    return NextResponse.json({ error: '이미 발행된 소식지입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('newsletters')
    .update({
      status: 'PUBLISHED',
      published_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
