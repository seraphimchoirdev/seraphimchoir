import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

import type { PhotoCommentWithAuthor } from '@/types/community';

const createCommentSchema = z.object({
  parent_id: z.string().uuid().optional(),
  content: z.string().min(1).max(500),
});

/**
 * GET /api/community/albums/[id]/photos/[photoId]/comments
 * 사진 댓글 목록 (트리 구조)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const adminClient = await createAdminClient();

  // 모든 댓글 조회 (soft-deleted 포함, 스레딩 유지)
  const { data: comments, error } = await adminClient
    .from('album_photo_comments')
    .select('*')
    .eq('photo_id', photoId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!comments || comments.length === 0) {
    return NextResponse.json([]);
  }

  // author 정보 조회
  const authorIds = [...new Set(comments.map((c) => c.author_id))];
  const { data: authors } = await adminClient
    .from('user_profiles')
    .select('id, name, role, linked_member:members(part)')
    .in('id', authorIds);

  const authorMap = new Map<string, PhotoCommentWithAuthor['author']>();
  if (authors) {
    for (const a of authors) {
      const linked = a.linked_member as unknown as { part: string } | null;
      authorMap.set(a.id, {
        id: a.id,
        name: a.name || '알 수 없음',
        part: linked?.part || null,
        role: a.role || null,
      });
    }
  }

  // 트리 구조 조립
  const enriched: PhotoCommentWithAuthor[] = comments.map((c) => ({
    ...c,
    author: c.is_deleted ? null : authorMap.get(c.author_id) || null,
    replies: [],
  }));

  const commentMap = new Map<string, PhotoCommentWithAuthor>();
  const topLevel: PhotoCommentWithAuthor[] = [];

  for (const comment of enriched) {
    commentMap.set(comment.id, comment);
  }

  for (const comment of enriched) {
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(comment);
      }
    } else {
      topLevel.push(comment);
    }
  }

  return NextResponse.json(topLevel);
}

/**
 * POST /api/community/albums/[id]/photos/[photoId]/comments
 * 사진 댓글 작성
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '잘못된 요청입니다.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 대댓글 depth 검증: parent의 parent_id가 null이어야 함 (1단계만)
  if (data.parent_id) {
    const { data: parent } = await supabase
      .from('album_photo_comments')
      .select('parent_id')
      .eq('id', data.parent_id)
      .single();

    if (!parent) {
      return NextResponse.json(
        { error: '원본 댓글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (parent.parent_id !== null) {
      return NextResponse.json(
        { error: '대댓글에는 답글을 달 수 없습니다.' },
        { status: 400 }
      );
    }
  }

  const { data: comment, error: insertError } = await supabase
    .from('album_photo_comments')
    .insert({
      photo_id: photoId,
      parent_id: data.parent_id || null,
      author_id: user.id,
      content: data.content,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(comment, { status: 201 });
}
