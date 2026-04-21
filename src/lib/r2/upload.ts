/**
 * R2 업로드/삭제 유틸리티 (서버 전용)
 */
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { getR2Client } from './client';

interface UploadParams {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | ReadableStream;
  contentType: string;
  metadata?: Record<string, string>;
}

interface UploadResult {
  key: string;
  bucket: string;
}

/**
 * R2에 파일 업로드
 */
export async function uploadToR2({
  bucket,
  key,
  body,
  contentType,
  metadata,
}: UploadParams): Promise<UploadResult> {
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return { key, bucket };
}

/**
 * R2에서 파일 삭제
 */
export async function deleteFromR2(bucket: string, key: string): Promise<void> {
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/**
 * R2에서 파일 가져오기 (비공개 파일 프록시용)
 */
export async function getFromR2(
  bucket: string,
  key: string
): Promise<{
  body: ReadableStream;
  contentType: string;
  contentLength: number;
}> {
  const client = getR2Client();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error('파일을 찾을 수 없습니다.');
  }

  return {
    body: response.Body as ReadableStream,
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength || 0,
  };
}

/**
 * UUID 기반 고유 파일 키 생성
 */
export function generateFileKey(prefix: string, originalName: string): string {
  const uuid = crypto.randomUUID();
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  return `${prefix}/${uuid}.${ext}`;
}
