import { NextRequest, NextResponse } from 'next/server';

import { canParticipateInCommunity } from '@/lib/community/album-constants';
import {
  DOCUMENT_ALLOWED_TYPES,
  IMAGE_ALLOWED_TYPES,
  R2_LIMITS,
  R2_PRIVATE_BUCKET,
  R2_PUBLIC_BUCKET,
} from '@/lib/r2/constants';
import { generateFileKey, uploadToR2 } from '@/lib/r2/upload';
import { createClient } from '@/lib/supabase/server';

import { hasPermission, type UserRole } from '@/app/api/auth/types';

/**
 * POST /api/files/upload
 *
 * R2에 파일을 업로드합니다.
 * FormData로 전송: file, bucket ('public' | 'private'), prefix (저장 경로 접두사)
 *
 * 권한:
 * - public 버킷: 인증된 사용자 (linked member)
 * - private 버킷: MANAGER 이상
 */
export async function POST(request: NextRequest) {
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
      .select('role, linked_member_id')
      .eq('id', user.id)
      .single();

    // 연결된 대원이거나 운영진(linked 없는 관리자 계정 등)이면 업로드 허용
    if (!profile || !canParticipateInCommunity(profile)) {
      return NextResponse.json({ error: '업로드 권한이 없습니다.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucketType = (formData.get('bucket') as string) || 'public';
    const prefix = (formData.get('prefix') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
    }

    // 비공개 버킷은 MANAGER 이상만
    if (bucketType === 'private') {
      if (!hasPermission(profile.role as UserRole, 'canManageDocuments')) {
        return NextResponse.json({ error: '문서 관리 권한이 없습니다.' }, { status: 403 });
      }
    }

    // 파일 크기 검증
    const isImage = file.type.startsWith('image/');
    const maxSize = isImage ? R2_LIMITS.IMAGE_MAX_SIZE : R2_LIMITS.DOCUMENT_MAX_SIZE;

    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / 1024 / 1024);
      return NextResponse.json(
        { error: `파일 크기가 ${maxMB}MB를 초과합니다.` },
        { status: 400 }
      );
    }

    // MIME 타입 검증
    const allowedTypes = bucketType === 'private'
      ? DOCUMENT_ALLOWED_TYPES
      : IMAGE_ALLOWED_TYPES;

    if (!allowedTypes.includes(file.type as never)) {
      return NextResponse.json(
        { error: `허용되지 않는 파일 형식입니다: ${file.type}` },
        { status: 400 }
      );
    }

    // R2 업로드
    const bucket = bucketType === 'private' ? R2_PRIVATE_BUCKET : R2_PUBLIC_BUCKET;
    const key = generateFileKey(prefix, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadToR2({
      bucket,
      key,
      body: buffer,
      contentType: file.type,
      metadata: {
        'uploaded-by': user.id,
        'original-name': encodeURIComponent(file.name),
      },
    });

    // 공개 버킷이면 CDN URL 반환, 비공개면 key만 반환
    const publicUrl = bucketType === 'public'
      ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${result.key}`
      : undefined;

    return NextResponse.json({
      key: result.key,
      bucket: result.bucket,
      url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    return NextResponse.json(
      { error: '파일 업로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
