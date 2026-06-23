import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

import type { AlbumWithMeta } from '@/types/community';

const ALLOWED_CREATE_ROLES = [
  'ADMIN',
  'CONDUCTOR',
  'MANAGER',
  'SECRETARY',
  'TREASURER',
  'PART_LEADER',
];

const createAlbumSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cover_image_path: z.string().optional(),
  choir_event_id: z.string().uuid().optional(),
});

/**
 * GET /api/community/albums
 * 앨범 목록 (커서 기반: event_date desc + id 보조 정렬)
 *
 * Query params:
 * - cursor: ISO date (event_date)
 * - limit: number (default 20)
 * - search: 제목 검색
 * - year: YYYY 필터
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

  const sp = request.nextUrl.searchParams;
  const cursor = sp.get('cursor');
  const search = sp.get('search')?.trim() || null;
  const year = sp.get('year');
  const limit = Math.min(Number(sp.get('limit')) || 20, 50);

  const adminClient = await createAdminClient();

  let query = adminClient
    .from('photo_albums')
    .select('*')
    .eq('is_deleted', false)
    .order('event_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('event_date', cursor);
  if (search) query = query.ilike('title', `%${search}%`);
  if (year && /^\d{4}$/.test(year)) {
    query = query.gte('event_date', `${year}-01-01`).lte('event_date', `${year}-12-31`);
  }

  const { data: albums, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = await enrichAlbums(adminClient, albums || []);
  const hasMore = (albums?.length || 0) === limit;
  const nextCursor =
    hasMore && albums?.length ? albums[albums.length - 1].event_date : null;

  return NextResponse.json({ data: enriched, nextCursor, hasMore });
}

/**
 * POST /api/community/albums
 * 앨범 생성 (리더 권한 이상)
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

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('linked_member_id, role')
    .eq('id', user.id)
    .single();

  // 앨범 생성은 운영진(ALLOWED_CREATE_ROLES) 권한이 필요하다.
  // 운영진은 연결된 대원(linked_member)이 없을 수 있으므로(예: 시스템 관리자 계정)
  // 역할만으로 허용한다.
  if (!ALLOWED_CREATE_ROLES.includes(profile?.role || '')) {
    return NextResponse.json(
      { error: '앨범 생성 권한이 없습니다.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createAlbumSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '잘못된 요청입니다.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 권한은 위에서 검증 완료. insert는 adminClient로 수행한다.
  // (RLS의 'Albums insertable by leaders'가 is_member_linked()를 요구해
  //  linked_member 없는 운영진 계정이 사용자 클라이언트로는 막히기 때문 —
  //  사진 insert 등 다른 앨범 작업과 동일하게 adminClient 사용)
  const adminClient = await createAdminClient();
  const { data: album, error: insertError } = await adminClient
    .from('photo_albums')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      event_date: parsed.data.event_date,
      cover_image_path: parsed.data.cover_image_path || null,
      choir_event_id: parsed.data.choir_event_id || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(album, { status: 201 });
}

// ============================================================
// Helper: 앨범에 creator + cover_url + event 정보 추가
// ============================================================
async function enrichAlbums(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  albums: Array<Record<string, unknown>>
): Promise<AlbumWithMeta[]> {
  if (albums.length === 0) return [];

  const creatorIds = [...new Set(albums.map((a) => a.created_by as string))];
  const eventIds = [
    ...new Set(
      albums
        .map((a) => a.choir_event_id as string | null)
        .filter((v): v is string => !!v)
    ),
  ];

  const [creatorsRes, eventsRes] = await Promise.all([
    adminClient.from('user_profiles').select('id, name, role').in('id', creatorIds),
    eventIds.length > 0
      ? adminClient
          .from('choir_events')
          .select('id, title, date')
          .in('id', eventIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; date: string }> }),
  ]);

  const creatorMap = new Map<string, AlbumWithMeta['creator']>();
  if (creatorsRes.data) {
    for (const c of creatorsRes.data) {
      creatorMap.set(c.id, {
        id: c.id,
        name: c.name || '알 수 없음',
        role: c.role || null,
      });
    }
  }

  const eventMap = new Map<string, AlbumWithMeta['event']>();
  if (eventsRes.data) {
    for (const e of eventsRes.data) {
      eventMap.set(e.id, { id: e.id, title: e.title, event_date: e.date });
    }
  }

  return albums.map((a) => ({
    ...(a as unknown as AlbumWithMeta),
    creator: creatorMap.get(a.created_by as string) || null,
    cover_url: (a.cover_image_path as string | null) || null,
    event: a.choir_event_id ? eventMap.get(a.choir_event_id as string) || null : null,
  }));
}
