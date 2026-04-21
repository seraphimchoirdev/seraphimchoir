import { NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * GET /api/community/posts/unread-count
 * 미확인 공지 수 (네비게이션 뱃지용)
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const adminClient = await createAdminClient();

  // 확인 요청이 있는 공지 목록
  const { data: notices } = await adminClient
    .from('community_posts')
    .select('id')
    .eq('post_type', 'notice')
    .eq('requires_confirmation', true)
    .eq('is_deleted', false);

  if (!notices || notices.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  // 사용자가 확인한 공지 목록
  const noticeIds = notices.map((n) => n.id);
  const { data: confirmed } = await adminClient
    .from('notice_confirmations')
    .select('post_id')
    .eq('user_id', user.id)
    .in('post_id', noticeIds);

  const confirmedSet = new Set(confirmed?.map((c) => c.post_id) ?? []);
  const unreadCount = noticeIds.filter((id) => !confirmedSet.has(id)).length;

  return NextResponse.json({ count: unreadCount });
}
