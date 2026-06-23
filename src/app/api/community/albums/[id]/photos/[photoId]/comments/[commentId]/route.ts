import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

const updateCommentSchema = z.object({
  content: z.string().min(1).max(500),
});

/**
 * PATCH /api/community/albums/[id]/photos/[photoId]/comments/[commentId]
 * 사진 댓글 수정
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  // RLS가 author_id 검증 (본인만 수정 가능)
  const { data: updated, error: updateError } = await supabase
    .from('album_photo_comments')
    .update({ content: parsed.data.content })
    .eq('id', commentId)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없거나 수정 권한이 없습니다.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}

/**
 * DELETE /api/community/albums/[id]/photos/[photoId]/comments/[commentId]
 * 사진 댓글 삭제 (soft delete)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  // RLS가 author_id 또는 ADMIN 검증
  const { error: updateError } = await supabase
    .from('album_photo_comments')
    .update({ is_deleted: true })
    .eq('id', commentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
