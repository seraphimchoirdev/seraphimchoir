import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/community/posts/[id]/confirm
 * 공지 확인 (멱등 INSERT)
 * - 주로 클라이언트에서 자동 호출됨 (상세 조회 시)
 * - 수동 호출도 지원
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  // 게시글 확인
  const { data: post } = await supabase
    .from('community_posts')
    .select('id, post_type, requires_confirmation')
    .eq('id', postId)
    .single();

  if (!post) {
    return NextResponse.json(
      { error: '게시글을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  if (post.post_type !== 'notice') {
    return NextResponse.json(
      { error: '공지사항만 확인할 수 있습니다.' },
      { status: 400 }
    );
  }

  // 멱등 INSERT
  const { error: insertError } = await supabase
    .from('notice_confirmations')
    .insert({ post_id: postId, user_id: user.id });

  if (insertError && insertError.code !== '23505') {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ confirmed: true });
}
