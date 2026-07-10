import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import {
  AUTO_ALBUM_SENTINEL,
  canParticipateInCommunity,
} from '@/lib/community/album-constants';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const quickUploadSchema = z.object({
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

function getMonthlyAlbumMeta(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthFirstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const title = `${year}년 ${month}월 사진`;
  return { year, month, monthFirstDay, title };
}

/**
 * POST /api/community/albums/quick-upload
 * 앨범 없이 사진을 올리면 월별 자동 앨범에 분류해 저장.
 *
 * 동작:
 * 1. 현재 월에 해당하는 자동 앨범(description = AUTO_ALBUM_SENTINEL) 검색
 * 2. 없으면 신규 생성 (created_by = 현재 사용자)
 * 3. album_photos에 사진 일괄 insert
 * 4. 앨범에 커버가 없었으면 첫 사진을 커버로 설정
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

  // 대원 연동 확인: 연결된 대원이거나 운영진(linked 없는 관리자 계정 등)이면 허용
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('linked_member_id, link_status, role')
    .eq('id', user.id)
    .single();
  if (!profile || !canParticipateInCommunity(profile)) {
    return NextResponse.json(
      { error: '사진 업로드 권한이 없습니다.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = quickUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '잘못된 요청입니다.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { monthFirstDay, title } = getMonthlyAlbumMeta();
  const adminClient = await createAdminClient();

  // 1. 자동 앨범 find-or-create
  // (description + event_date + is_deleted 조합으로 고유 식별)
  let { data: album } = await adminClient
    .from('photo_albums')
    .select('id, cover_image_path')
    .eq('description', AUTO_ALBUM_SENTINEL)
    .eq('event_date', monthFirstDay)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!album) {
    // RLS 우회: 자동 앨범은 권한과 무관하게 시스템 동작이므로 admin으로 insert
    // (created_by는 첫 업로드 사용자, 이후 권한은 일반 앨범과 동일하게 적용)
    const { data: created, error: createErr } = await adminClient
      .from('photo_albums')
      .insert({
        title,
        description: AUTO_ALBUM_SENTINEL,
        event_date: monthFirstDay,
        created_by: user.id,
      })
      .select('id, cover_image_path')
      .single();

    if (createErr || !created) {
      return NextResponse.json(
        { error: createErr?.message || '자동 앨범 생성에 실패했습니다.' },
        { status: 500 }
      );
    }
    album = created;
  }

  // 2. 사진 일괄 insert (RLS는 user_id = auth.uid() 검증, supabase 클라이언트 사용)
  const rows = parsed.data.photos.map((p) => ({
    album_id: album!.id,
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

  // 3. 커버 자동 지정
  if (!album.cover_image_path && inserted && inserted.length > 0) {
    await adminClient
      .from('photo_albums')
      .update({ cover_image_path: inserted[0].file_path })
      .eq('id', album.id);
  }

  return NextResponse.json(
    {
      album_id: album.id,
      added: inserted?.length ?? 0,
      data: inserted,
    },
    { status: 201 }
  );
}
