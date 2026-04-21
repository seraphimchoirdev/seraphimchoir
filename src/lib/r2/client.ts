/**
 * Cloudflare R2 클라이언트 (서버 전용)
 *
 * S3 호환 API를 사용하여 R2에 접근합니다.
 * 이 모듈은 서버 환경(API Route, Server Component)에서만 사용합니다.
 */
import { S3Client } from '@aws-sdk/client-s3';

import { R2_PRIVATE_BUCKET, R2_PUBLIC_BUCKET } from './constants';

let _client: S3Client | null = null;

function getR2Client(): S3Client {
  if (_client) return _client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 환경변수가 설정되지 않았습니다. R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY를 확인하세요.'
    );
  }

  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return _client;
}

export { getR2Client, R2_PRIVATE_BUCKET, R2_PUBLIC_BUCKET };
