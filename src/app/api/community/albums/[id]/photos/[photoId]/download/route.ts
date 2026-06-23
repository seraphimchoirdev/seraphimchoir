import { NextRequest, NextResponse } from 'next/server';

import { R2_PUBLIC_BUCKET } from '@/lib/r2/constants';
import { getFromR2 } from '@/lib/r2/upload';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * GET /api/community/albums/[id]/photos/[photoId]/download
 *
 * 앨범 사진을 다운로드한다. 사진은 공개(saeropim-public) 버킷에 있어
 * CDN 직접 URL이 존재하지만, 크로스오리진이라 브라우저의 `download` 속성이
 * 무시되므로 프록시를 거쳐 Content-Disposition: attachment로 응답한다.
 *
 * file_path는 클라이언트가 아닌 DB(photoId)에서 조회하여 IDOR을 방지한다.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // photoId로 file_path 조회 (임의 경로 다운로드 차단)
    const adminClient = await createAdminClient();
    const { data: photo } = await adminClient
      .from('album_photos')
      .select('file_path')
      .eq('id', photoId)
      .single();

    if (!photo) {
      return NextResponse.json(
        { error: '사진을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // file_path는 전체 CDN URL일 수도, 버킷 내 키일 수도 있으므로 키만 추출
    const key = toBucketKey(photo.file_path);

    const { body, contentType, contentLength } = await getFromR2(
      R2_PUBLIC_BUCKET,
      key
    );

    const fileName = decodeURIComponent(key.split('/').pop() || 'photo');

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(contentLength),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('사진 다운로드 실패:', error);
    return NextResponse.json(
      { error: '사진 다운로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 저장된 file_path에서 R2 버킷 키를 추출한다.
 * - 전체 URL(https://pub-xxx.r2.dev/community/uuid.jpg)이면 경로 부분만
 * - 이미 키(community/uuid.jpg)면 그대로
 */
function toBucketKey(filePath: string): string {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    try {
      return new URL(filePath).pathname.replace(/^\//, '');
    } catch {
      return filePath;
    }
  }
  return filePath.replace(/^\//, '');
}
