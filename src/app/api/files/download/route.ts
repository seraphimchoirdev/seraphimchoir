import { NextRequest, NextResponse } from 'next/server';

import { R2_PRIVATE_BUCKET } from '@/lib/r2/constants';
import { getFromR2 } from '@/lib/r2/upload';
import { createClient } from '@/lib/supabase/server';

import { hasPermission, type UserRole } from '@/app/api/auth/types';

/**
 * GET /api/files/download?path=documents/2026/xxx.pdf
 *
 * 비공개 R2 버킷(saeropim-private)에서 파일을 다운로드합니다.
 * MANAGER 이상 권한이 필요합니다.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 역할 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!hasPermission(profile?.role as UserRole, 'canViewDocuments')) {
      return NextResponse.json({ error: '문서 조회 권한이 없습니다.' }, { status: 403 });
    }

    const filePath = request.nextUrl.searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'path 파라미터가 필요합니다.' }, { status: 400 });
    }

    // 경로 탐색 공격 방지
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return NextResponse.json({ error: '잘못된 파일 경로입니다.' }, { status: 400 });
    }

    const { body, contentType, contentLength } = await getFromR2(R2_PRIVATE_BUCKET, filePath);

    // 원본 파일명 추출 (경로에서 UUID 제거)
    const fileName = decodeURIComponent(
      filePath.split('/').pop() || 'download'
    );

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(contentLength),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('파일 다운로드 실패:', error);
    return NextResponse.json(
      { error: '파일 다운로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
