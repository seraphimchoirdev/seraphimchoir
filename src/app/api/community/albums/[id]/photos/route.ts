import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { canParticipateInCommunity } from '@/lib/community/album-constants';
import { createAdminClient, createClient } from '@/lib/supabase/server';

import type { AlbumPhotoWithUploader } from '@/types/community';

const uploadPhotosSchema = z.object({
  photos: z
    .array(
      z.object({
        file_path: z.string().min(1),
        thumbnail_path: z.string().optional(),
        caption: z.string().max(200).optional(),
        file_size: z.number().int().nonnegative().optional(),
      })
    )
    .min(1)
    .max(50),
});

/**
 * GET /api/community/albums/[id]/photos
 * 앨범 내 사진 목록 (커서 기반)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: albumId } = await params;
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
  const limit = Math.min(Number(sp.get('limit')) || 30, 100);

  const adminClient = await createAdminClient();
  let query = adminClient
    .from('album_photos')
    .select('*')
    .eq('album_id', albumId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data: photos, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 업로더 정보 enrich
  const uploaderIds = [
    ...new Set((photos || []).map((p) => p.uploaded_by as string)),
  ];
  const { data: uploaders } = uploaderIds.length
    ? await adminClient
        .from('user_profiles')
        .select('id, name, role')
        .in('id', uploaderIds)
    : { data: [] };

  const uploaderMap = new Map<string, AlbumPhotoWithUploader['uploader']>();
  for (const u of uploaders || []) {
    uploaderMap.set(u.id, {
      id: u.id,
      name: u.name || '알 수 없음',
      role: u.role || null,
    });
  }

  // 반응 enrich: 내 반응 + 이모지별 집계 (배치 조회로 N+1 회피)
  const photoIds = (photos || []).map((p) => p.id);
  const myReactionMap = new Map<string, string>();
  const reactionCountMap = new Map<string, Record<string, number>>();

  if (photoIds.length) {
    const { data: reactions } = await adminClient
      .from('album_photo_reactions')
      .select('photo_id, user_id, emoji')
      .in('photo_id', photoIds);

    for (const r of reactions || []) {
      // 이모지별 집계
      const counts = reactionCountMap.get(r.photo_id) ?? {};
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
      reactionCountMap.set(r.photo_id, counts);
      // 현재 사용자의 반응
      if (r.user_id === user.id) {
        myReactionMap.set(r.photo_id, r.emoji);
      }
    }
  }

  const enriched: AlbumPhotoWithUploader[] = (photos || []).map((p) => ({
    ...p,
    uploader: uploaderMap.get(p.uploaded_by) || null,
    my_reaction: myReactionMap.get(p.id) ?? null,
    reaction_counts: reactionCountMap.get(p.id) ?? {},
    comment_count: p.comment_count ?? 0,
  }));

  const hasMore = (photos?.length || 0) === limit;
  const nextCursor =
    hasMore && photos?.length ? photos[photos.length - 1].created_at : null;

  return NextResponse.json({ data: enriched, nextCursor, hasMore });
}

/**
 * POST /api/community/albums/[id]/photos
 * 사진 일괄 추가
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: albumId } = await params;
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
  // 연결된 대원이거나 운영진(linked 없는 관리자 계정 등)이면 업로드 허용
  if (!profile || !canParticipateInCommunity(profile)) {
    return NextResponse.json(
      { error: '사진 업로드 권한이 없습니다.' },
      { status: 403 }
    );
  }

  // 앨범 존재 확인 (관리자 클라이언트로)
  const adminClient = await createAdminClient();
  const { data: album } = await adminClient
    .from('photo_albums')
    .select('id, is_deleted, cover_image_path')
    .eq('id', albumId)
    .single();
  if (!album || album.is_deleted) {
    return NextResponse.json(
      { error: '앨범을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  const body = await request.json();
  const parsed = uploadPhotosSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '잘못된 요청입니다.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const rows = parsed.data.photos.map((p) => ({
    album_id: albumId,
    uploaded_by: user.id,
    file_path: p.file_path,
    thumbnail_path: p.thumbnail_path || null,
    caption: p.caption || null,
    file_size: p.file_size ?? null,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('album_photos')
    .insert(rows)
    .select();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 커버 이미지 자동 설정 (앨범에 커버가 없으면 첫 사진으로)
  if (!album.cover_image_path && inserted && inserted.length > 0) {
    await adminClient
      .from('photo_albums')
      .update({ cover_image_path: inserted[0].file_path })
      .eq('id', albumId);
  }

  return NextResponse.json({ data: inserted }, { status: 201 });
}
