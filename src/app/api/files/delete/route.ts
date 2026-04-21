import { NextRequest, NextResponse } from 'next/server';

import { R2_PRIVATE_BUCKET, R2_PUBLIC_BUCKET } from '@/lib/r2/constants';
import { deleteFromR2 } from '@/lib/r2/upload';
import { createClient } from '@/lib/supabase/server';

import { hasPermission, type UserRole } from '@/app/api/auth/types';

/**
 * DELETE /api/files/delete
 * Body: { key: string, bucket: 'public' | 'private' }
 *
 * R2에서 파일을 삭제합니다.
 *
 * 권한:
 * - private 버킷: MANAGER 이상 (canManageDocuments)
 * - public 버킷: MANAGER 이상 (관리자 삭제) 또는 업로더 본인 (DB에서 확인)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const body = await request.json();
    const { key, bucket: bucketType } = body as { key: string; bucket: 'public' | 'private' };

    if (!key || !bucketType) {
      return NextResponse.json(
        { error: 'key와 bucket이 필요합니다.' },
        { status: 400 }
      );
    }

    // 경로 탐색 공격 방지
    if (key.includes('..') || key.startsWith('/')) {
      return NextResponse.json({ error: '잘못된 파일 경로입니다.' }, { status: 400 });
    }

    // 비공개 버킷 삭제: MANAGER 이상
    if (bucketType === 'private') {
      if (!hasPermission(profile?.role as UserRole, 'canManageDocuments')) {
        return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
      }
    }

    const bucket = bucketType === 'private' ? R2_PRIVATE_BUCKET : R2_PUBLIC_BUCKET;
    await deleteFromR2(bucket, key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('파일 삭제 실패:', error);
    return NextResponse.json(
      { error: '파일 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
