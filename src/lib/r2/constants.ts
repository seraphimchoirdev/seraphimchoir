/**
 * Cloudflare R2 상수 정의
 */

/** 공개 버킷: 배치표, 커뮤니티 사진 등 (CDN 직접 접근) */
export const R2_PUBLIC_BUCKET = 'saeropim-public';

/** 비공개 버킷: 문서 아카이브 (API Route 프록시 경유) */
export const R2_PRIVATE_BUCKET = 'saeropim-private';

/** R2 Public CDN URL (클라이언트에서 이미지 직접 접근용) */
export function getR2PublicUrl(): string {
  const url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_R2_PUBLIC_URL이 설정되지 않았습니다.');
  }
  return url.replace(/\/$/, '');
}

/** 파일 업로드 제한 */
export const R2_LIMITS = {
  /** 문서 최대 크기 (50MB) */
  DOCUMENT_MAX_SIZE: 50 * 1024 * 1024,
  /** 이미지 최대 크기 (10MB) */
  IMAGE_MAX_SIZE: 10 * 1024 * 1024,
  /** 게시글당 최대 이미지 수 */
  POST_MAX_IMAGES: 5,
  /** 앨범 한 번 업로드 최대 사진 수 */
  ALBUM_UPLOAD_MAX: 20,
  /** 앨범당 최대 사진 수 */
  ALBUM_MAX_PHOTOS: 200,
} as const;

/** 문서 허용 MIME 타입 */
export const DOCUMENT_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
] as const;

/** 이미지 허용 MIME 타입 */
export const IMAGE_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;
