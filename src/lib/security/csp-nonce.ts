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
 * 환경별 CSP 정책 생성
 *
 * @param nonce - 프로덕션 환경에서 사용할 nonce (개발 환경에서는 무시)
 * @returns CSP 헤더 문자열
 */
export function generateCSPHeader(nonce?: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 기본 CSP 지시어
  const directives: Record<string, string[] | undefined> = {
    'default-src': ["'self'"],
    'script-src': isDevelopment
      ? ["'self'", "'unsafe-eval'", "'unsafe-inline'"] // 개발 환경: Next.js 개발 도구 지원
      : ["'self'", "'unsafe-inline'"], // 프로덕션: nonce 제거하고 unsafe-inline만 사용
    'style-src': isDevelopment
      ? ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'] // 개발 환경: Tailwind JIT 지원
      : ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'], // 프로덕션: nonce 제거하고 unsafe-inline만 사용
    'img-src': ["'self'", 'data:', 'https://*.supabase.co', 'blob:'],
    'font-src': ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://*.ingest.sentry.io',
      'https://*.upstash.com', // Upstash Redis
      'https://vitals.vercel-analytics.com', // Vercel Analytics
      'https://*.vercel-insights.com', // Vercel Speed Insights
      'https://cdn.jsdelivr.net', // Pretendard 폰트 소스맵
    ],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'script-src-elem': isDevelopment
      ? undefined // 개발 환경에서는 script-src와 동일
      : ["'self'", "'unsafe-inline'"],
    'style-src-elem': isDevelopment
      ? undefined // 개발 환경에서는 style-src와 동일
      : ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    'upgrade-insecure-requests': isDevelopment ? undefined : [''],
    'block-all-mixed-content': isDevelopment ? undefined : [''],
  };

  // 지시어를 CSP 문자열로 변환
  const policy = Object.entries(directives)
    .filter(([_, values]) => values !== undefined && values.length > 0)
    .map(([directive, values]) => {
      // TypeScript에게 values가 undefined가 아님을 확신시킴
      if (!values) return '';
      if (values.length === 1 && values[0] === '') {
        return directive; // 값이 없는 지시어 (upgrade-insecure-requests 등)
      }
      return `${directive} ${values.join(' ')}`;
    })
    .filter(Boolean)
    .join('; ');

  return policy;
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

/**
 * CSP 리포트 URI 설정 (선택적)
 * Sentry나 별도의 CSP 리포트 수집 서비스로 위반 사항을 전송
 */
export function getCSPReportUri(): string | undefined {
  // 프로덕션에서만 CSP 위반 리포트 수집
  if (process.env.NODE_ENV === 'production') {
    // 환경변수로 설정된 CSP Report URI 사용
    if (process.env.CSP_REPORT_URI) {
      return process.env.CSP_REPORT_URI;
    }

    // Sentry DSN이 있으면 Sentry CSP 리포팅 사용
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Sentry DSN에서 project ID 추출
      const match = process.env.NEXT_PUBLIC_SENTRY_DSN.match(/https:\/\/(.+)@(.+)\.ingest\.sentry\.io\/(\d+)/);
      if (match) {
        const [, publicKey, org, projectId] = match;
        return `https://sentry.io/api/${projectId}/security/?sentry_key=${publicKey}`;
      }
    }
  }
  return undefined;
}

/**
 * CSP 헤더 전체 생성 (report-uri 및 report-to 포함)
 */
export function generateFullCSPHeader(nonce?: string): string {
  let cspHeader = generateCSPHeader(nonce);

  const reportUri = getCSPReportUri();
  if (reportUri) {
    // report-uri (구형 브라우저 호환)
    cspHeader += `; report-uri ${reportUri}`;

    // report-to (최신 표준)
    // Report-To 헤더는 별도로 설정해야 함
    cspHeader += `; report-to csp-endpoint`;
  }

  return cspHeader;
}

/**
 * Report-To 헤더 생성 (최신 Reporting API)
 */
export function generateReportToHeader(): string | undefined {
  const reportUri = getCSPReportUri();
  if (!reportUri) return undefined;

  const reportTo = {
    group: 'csp-endpoint',
    max_age: 10886400, // 126일
    endpoints: [{ url: reportUri }],
    include_subdomains: true,
  };

  return JSON.stringify(reportTo);
}