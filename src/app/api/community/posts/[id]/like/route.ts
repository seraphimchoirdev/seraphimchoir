import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/community/posts/[id]/like
 * 좋아요 토글 (INSERT → 이미 있으면 DELETE)
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

  // INSERT 시도
  const { error: insertError } = await supabase
    .from('post_likes')
    .insert({ post_id: postId, user_id: user.id });

  if (insertError) {
    if (insertError.code === '23505') {
      // 이미 좋아요 → 삭제 (unlike)
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      // 업데이트된 카운트 조회
      const { data: post } = await supabase
        .from('community_posts')
        .select('like_count')
        .eq('id', postId)
        .single();

      return NextResponse.json({
        liked: false,
        like_count: post?.like_count ?? 0,
      });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 좋아요 성공 → 카운트 조회
  const { data: post } = await supabase
    .from('community_posts')
    .select('like_count')
    .eq('id', postId)
    .single();

  return NextResponse.json({
    liked: true,
    like_count: post?.like_count ?? 0,
  });
}
