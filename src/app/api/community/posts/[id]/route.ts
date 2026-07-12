import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

const updatePostSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  category: z
    .enum(['performance', 'celebration', 'sharing', 'daily', 'prayer'])
    .optional(),
  priority: z.enum(['normal', 'important', 'urgent']).optional(),
  is_pinned: z.boolean().optional(),
  requires_confirmation: z.boolean().optional(),
  is_deleted: z.boolean().optional(),
});

/**
 * GET /api/community/posts/[id]
 * 게시글 상세 조회
 * - 공지에 requires_confirmation이면 자동 읽음 처리
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const adminClient = await createAdminClient();

  // 게시글 조회
  const { data: post, error } = await adminClient
    .from('community_posts')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (error || !post) {
    return NextResponse.json(
      { error: '게시글을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  // 병렬 조회: author, attachments, like 여부, 확인 여부
  const [authorResult, attachmentsResult, likeResult, confirmResult] =
    await Promise.all([
      adminClient
        .from('user_profiles')
        .select('id, name, role, linked_member:members(part)')
        .eq('id', post.author_id)
        .single(),
      adminClient
        .from('post_attachments')
        .select('*')
        .eq('post_id', id)
        .order('sort_order'),
      adminClient
        .from('post_likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .maybeSingle(),
      adminClient
        .from('notice_confirmations')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

  // 공지 자동 읽음 처리: requires_confirmation이고 아직 확인 안 했으면
  if (
    post.post_type === 'notice' &&
    post.requires_confirmation &&
    !confirmResult.data
  ) {
    // 멱등 INSERT (중복이면 무시)
    await supabase
      .from('notice_confirmations')
      .insert({ post_id: id, user_id: user.id })
      .select()
      .maybeSingle();
  }

  const linked = authorResult.data?.linked_member as unknown as {
    part: string;
  } | null;

  return NextResponse.json({
    ...post,
    author: authorResult.data
      ? {
          id: authorResult.data.id,
          name: authorResult.data.name || '알 수 없음',
          part: linked?.part || null,
          role: authorResult.data.role || null,
        }
      : null,
    attachments: attachmentsResult.data || [],
    is_liked_by_me: !!likeResult.data,
    is_confirmed_by_me:
      !!confirmResult.data || (post.post_type === 'notice' && post.requires_confirmation),
  });
}

/**
 * PATCH /api/community/posts/[id]
 * 게시글 수정 또는 soft delete
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updatePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '잘못된 요청입니다.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // soft delete 시 adminClient 사용 (SELECT RLS가 is_deleted=false 필터).
  // RLS를 우회하므로 앱 레벨에서 작성자/운영진 권한을 직접 검증한다.
  let client = supabase;
  if (parsed.data.is_deleted) {
    const [{ data: post }, { data: profile }] = await Promise.all([
      supabase.from('community_posts').select('author_id').eq('id', id).single(),
      supabase.from('user_profiles').select('role').eq('id', user.id).single(),
    ]);

    if (!post) {
      return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
    }

    const isAuthor = post.author_id === user.id;
    const isManager =
      !!profile?.role && ['ADMIN', 'CONDUCTOR', 'MANAGER'].includes(profile.role);

    if (!isAuthor && !isManager) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
    }

    client = await createAdminClient();
  }

  const { data: updated, error: updateError } = await client
    .from('community_posts')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없거나 수정 권한이 없습니다.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
