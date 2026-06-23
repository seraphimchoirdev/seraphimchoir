import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

const updateAlbumSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cover_image_path: z.string().nullable().optional(),
  choir_event_id: z.string().uuid().nullable().optional(),
  is_deleted: z.boolean().optional(),
});

/**
 * GET /api/community/albums/[id]
 * 앨범 상세
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
  const { data: album, error } = await adminClient
    .from('photo_albums')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (error || !album) {
    return NextResponse.json(
      { error: '앨범을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  const [creatorRes, eventRes] = await Promise.all([
    adminClient
      .from('user_profiles')
      .select('id, name, role')
      .eq('id', album.created_by)
      .single(),
    album.choir_event_id
      ? adminClient
          .from('choir_events')
          .select('id, title, date')
          .eq('id', album.choir_event_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const eventData = eventRes.data
    ? { id: eventRes.data.id, title: eventRes.data.title, event_date: eventRes.data.date }
    : null;

  return NextResponse.json({
    ...album,
    creator: creatorRes.data
      ? {
          id: creatorRes.data.id,
          name: creatorRes.data.name || '알 수 없음',
          role: creatorRes.data.role || null,
        }
      : null,
    cover_url: album.cover_image_path,
    event: eventData,
  });
}

/**
 * PATCH /api/community/albums/[id]
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
  const parsed = updateAlbumSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '잘못된 요청입니다.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // soft delete 시에는 RLS의 is_deleted=false 필터를 우회하기 위해 adminClient 사용
  const client = parsed.data.is_deleted
    ? await createAdminClient()
    : supabase;

  const { data: updated, error: updateError } = await client
    .from('photo_albums')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return NextResponse.json(
        { error: '앨범을 찾을 수 없거나 수정 권한이 없습니다.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}

/**
 * DELETE /api/community/albums/[id]
 * Hard delete (CASCADE로 album_photos까지 삭제됨)
 */
export async function DELETE(
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

  const { error } = await supabase.from('photo_albums').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
