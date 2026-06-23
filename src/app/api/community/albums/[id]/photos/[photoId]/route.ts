import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/community/albums/[id]/photos/[photoId]
 * 단일 사진 삭제
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const { id: albumId, photoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  // RLS가 업로더 또는 매니저만 삭제 허용
  const { data: deleted, error } = await supabase
    .from('album_photos')
    .delete()
    .eq('id', photoId)
    .eq('album_id', albumId)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!deleted) {
    return NextResponse.json(
      { error: '사진을 찾을 수 없거나 삭제 권한이 없습니다.' },
      { status: 404 }
    );
  }

  // 커버였으면 다음 사진으로 자동 교체 (없으면 null)
  const adminClient = await createAdminClient();
  const { data: album } = await adminClient
    .from('photo_albums')
    .select('cover_image_path')
    .eq('id', albumId)
    .single();

  if (album?.cover_image_path === deleted.file_path) {
    const { data: next } = await adminClient
      .from('album_photos')
      .select('file_path')
      .eq('album_id', albumId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    await adminClient
      .from('photo_albums')
      .update({ cover_image_path: next?.file_path || null })
      .eq('id', albumId);
  }

  return NextResponse.json({ success: true });
}
