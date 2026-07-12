/**
 * Content Security Policy (CSP) Nonce 유틸리티
 *
 * 프로덕션 환경에서 인라인 스크립트를 안전하게 실행하기 위한 nonce 생성 및 관리
 */
import { headers } from 'next/headers';

/**
 * CSP nonce 생성
 * Edge Runtime과 Node.js 환경 모두 지원
 *
 * @returns 128비트 무작위 nonce (base64 인코딩)
 */
export function generateNonce(): string {
  // Edge Runtime과 Node.js 모두에서 작동하는 방법 사용
  const array = new Uint8Array(16);

  // Edge Runtime에서는 Web Crypto API 사용
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
  }
  // Node.js 환경 (fallback)
  else if (typeof require !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Node.js fallback
    const crypto = require('crypto');
    const buffer = crypto.randomBytes(16);
    array.set(buffer);
  }
  // 둘 다 없는 경우 에러 발생 (보안상 중요)
  else {
    throw new Error('No secure random number generator available. Cannot generate CSP nonce.');
  }

  // base64 인코딩
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * 현재 요청의 nonce 가져오기 (서버 컴포넌트용)
 *
 * @returns 현재 요청의 CSP nonce
 */
export async function getNonce(): Promise<string | undefined> {
  const headersList = await headers();
  return headersList.get('x-nonce') || undefined;
}

/**
 * Script 태그에 nonce 속성 추가하는 헬퍼
 *
 * @example
 * ```tsx
 * import { getNonceProps } from '@/lib/security/csp-nonce';
 *
 * export default async function Page() {
 *   const nonceProps = await getNonceProps();
 *   return (
 *     <script {...nonceProps} dangerouslySetInnerHTML={{ __html: 'console.log("Hello")' }} />
 *   );
 * }
 * ```
 */
export async function getNonceProps(): Promise<{ nonce?: string }> {
  const nonce = await getNonce();
  return nonce ? { nonce } : {};
}

/**
 * 인라인 스타일에 nonce 속성 추가하는 헬퍼
 */
export async function getStyleNonceProps(): Promise<{ nonce?: string }> {
  const nonce = await getNonce();
  return nonce ? { nonce } : {};
}

// CSP 정책 생성 함수는 순수 모듈로 분리됨 (next.config.ts에서도 사용)
export {
  generateCSPHeader,
  getCSPReportUri,
  generateFullCSPHeader,
  generateReportToHeader,
} from './csp-policy';
