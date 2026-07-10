import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

import type { PostWithAuthor } from '@/types/community';

const createPostSchema = z.object({
  post_type: z.enum(['feed', 'notice']),
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(10000),
  category: z
    .enum(['performance', 'celebration', 'sharing', 'daily', 'prayer'])
    .optional(),
  priority: z.enum(['normal', 'important', 'urgent']).optional(),
  is_pinned: z.boolean().optional(),
  requires_confirmation: z.boolean().optional(),
  attachments: z
    .array(
      z.object({
        file_path: z.string(),
        file_name: z.string(),
        file_size: z.number(),
        mime_type: z.string(),
        thumbnail_path: z.string().optional(),
        sort_order: z.number(),
      })
    )
    .optional(),
});

/**
 * GET /api/community/posts
 * 게시글 목록 (커서 기반 페이지네이션)
 *
 * Query params:
 * - type: feed | notice
 * - category: FeedCategory (feed 전용)
 * - cursor: ISO timestamp
 * - limit: number (default 20)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'notice';
  const category = searchParams.get('category');
  const cursor = searchParams.get('cursor');
  const search = searchParams.get('search')?.trim() || null;
  const date = searchParams.get('date'); // ISO date, e.g. 2026-04-21
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

  // adminClient로 author 정보 조인 (RLS 우회하여 user_profiles + members 접근)
  const adminClient = await createAdminClient();

  // 공지: pinned 별도 조회
  let pinned: PostWithAuthor[] = [];
  if (type === 'notice' && !cursor) {
    const { data: pinnedRows } = await adminClient
      .from('community_posts')
      .select('*')
      .eq('post_type', 'notice')
      .eq('is_pinned', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (pinnedRows) {
      pinned = await enrichPostsWithAuthor(adminClient, pinnedRows, user.id);
    }
  }

  // 메인 쿼리
  let query = adminClient
    .from('community_posts')
    .select('*')
    .eq('post_type', type)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  // 공지: pinned 제외 (이미 별도 조회)
  if (type === 'notice') {
    query = query.eq('is_pinned', false);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.ilike('content', `%${search}%`);
  }

  if (date) {
    // 프론트(FeedFilters)가 보내는 date는 KST 로컬 날짜(YYYY-MM-DD)이므로
    // KST 자정(+09:00) 기준으로 하루 범위를 계산해야 UTC와 9시간 어긋나지 않는다
    const dayStart = new Date(`${date}T00:00:00+09:00`);
    const nextDay = new Date(dayStart);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    query = query
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', nextDay.toISOString());
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data: posts, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = await enrichPostsWithAuthor(
    adminClient,
    posts || [],
    user.id
  );

  const hasMore = (posts?.length || 0) === limit;
  const nextCursor = hasMore && posts?.length ? posts[posts.length - 1].created_at : null;

  if (type === 'notice') {
    return NextResponse.json({ pinned, data: enriched, nextCursor, hasMore });
  }

  return NextResponse.json({ data: enriched, nextCursor, hasMore });
}

/**
 * POST /api/community/posts
 * 게시글 작성
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  // linked member 확인
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('linked_member_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.linked_member_id) {
    return NextResponse.json(
      { error: '연결된 대원 정보가 필요합니다.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '잘못된 요청입니다.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 공지 작성 권한 체크
  if (data.post_type === 'notice') {
    const allowedRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY'];
    if (!allowedRoles.includes(profile.role || '')) {
      return NextResponse.json(
        { error: '공지사항 작성 권한이 없습니다.' },
        { status: 403 }
      );
    }
    if (!data.title) {
      return NextResponse.json(
        { error: '공지사항 제목은 필수입니다.' },
        { status: 400 }
      );
    }
  }

  // 게시글 삽입
  const { data: post, error: insertError } = await supabase
    .from('community_posts')
    .insert({
      post_type: data.post_type,
      title: data.title || null,
      content: data.content,
      author_id: user.id,
      category: data.post_type === 'feed' ? (data.category || 'daily') : null,
      priority: data.post_type === 'notice' ? (data.priority || 'normal') : null,
      is_pinned: data.post_type === 'notice' ? (data.is_pinned || false) : false,
      requires_confirmation:
        data.post_type === 'notice'
          ? (data.requires_confirmation || false)
          : false,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 첨부파일 삽입
  if (data.attachments && data.attachments.length > 0) {
    const attachmentRows = data.attachments.map((att) => ({
      post_id: post.id,
      file_path: att.file_path,
      file_name: att.file_name,
      file_size: att.file_size,
      mime_type: att.mime_type,
      thumbnail_path: att.thumbnail_path || null,
      sort_order: att.sort_order,
    }));

    await supabase.from('post_attachments').insert(attachmentRows);
  }

  return NextResponse.json(post, { status: 201 });
}

// ============================================================
// Helper: 게시글에 author 정보 + is_liked_by_me + is_confirmed_by_me 추가
// ============================================================
async function enrichPostsWithAuthor(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  posts: Array<Record<string, unknown>>,
  userId: string
): Promise<PostWithAuthor[]> {
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id as string);
  const authorIds = [...new Set(posts.map((p) => p.author_id as string))];

  // 병렬 조회: author 정보, 좋아요 여부, 확인 여부, 첨부파일
  const [authorsResult, likesResult, confirmationsResult, attachmentsResult] =
    await Promise.all([
      adminClient
        .from('user_profiles')
        .select('id, name, role, linked_member:members(part)')
        .in('id', authorIds),
      adminClient
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds),
      adminClient
        .from('notice_confirmations')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds),
      adminClient
        .from('post_attachments')
        .select('*')
        .in('post_id', postIds)
        .order('sort_order'),
    ]);

  // author map
  const authorMap = new Map<string, PostWithAuthor['author']>();
  if (authorsResult.data) {
    for (const a of authorsResult.data) {
      const linked = a.linked_member as unknown as { part: string } | null;
      authorMap.set(a.id, {
        id: a.id,
        name: a.name || '알 수 없음',
        part: linked?.part || null,
        role: a.role || null,
      });
    }
  }

  const likedSet = new Set(likesResult.data?.map((l) => l.post_id) ?? []);
  const confirmedSet = new Set(
    confirmationsResult.data?.map((c) => c.post_id) ?? []
  );

  // attachments map
  const attachmentMap = new Map<string, Array<Record<string, unknown>>>();
  if (attachmentsResult.data) {
    for (const att of attachmentsResult.data) {
      const list = attachmentMap.get(att.post_id) || [];
      list.push(att);
      attachmentMap.set(att.post_id, list);
    }
  }

  return posts.map((p) => ({
    ...(p as unknown as PostWithAuthor),
    author: authorMap.get(p.author_id as string) || null,
    attachments: (attachmentMap.get(p.id as string) || []) as PostWithAuthor['attachments'],
    is_liked_by_me: likedSet.has(p.id as string),
    is_confirmed_by_me: confirmedSet.has(p.id as string),
  }));
}
