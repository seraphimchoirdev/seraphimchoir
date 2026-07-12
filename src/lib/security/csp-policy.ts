/**
 * Content Security Policy 정책 생성 (순수 함수)
 *
 * next.config.ts(빌드 타임)와 서버 코드 양쪽에서 사용할 수 있도록
 * next/headers 등 요청 컨텍스트 의존이 없는 모듈로 분리.
 *
 * 참고: 현재 정책은 nonce를 사용하지 않고 'unsafe-inline'을 허용하므로
 * 요청별로 달라지지 않는다 → 미들웨어가 아닌 정적 헤더(next.config.ts)로 적용한다.
 */

/**
 * 환경별 CSP 정책 생성
 */
export function generateCSPHeader(_nonce?: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 기본 CSP 지시어
  const directives: Record<string, string[] | undefined> = {
    'default-src': ["'self'"],
    'script-src': isDevelopment
      ? ["'self'", "'unsafe-eval'", "'unsafe-inline'"] // 개발 환경: Next.js 개발 도구 지원
      : ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    'img-src': ["'self'", 'data:', 'https://*.supabase.co', 'blob:',
      ...(isDevelopment ? ['http://127.0.0.1:*'] : [])],
    'font-src': ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://*.ingest.sentry.io',
      'https://*.upstash.com', // Upstash Redis
      'https://vitals.vercel-analytics.com', // Vercel Analytics (legacy)
      'https://*.vercel-insights.com', // Vercel Speed Insights (legacy)
      'https://va.vercel-scripts.com', // Vercel Analytics (새 도메인)
      'https://cdn.jsdelivr.net', // Pretendard 폰트 소스맵
      ...(isDevelopment ? ['http://localhost:*', 'ws://localhost:*', 'http://127.0.0.1:*', 'ws://127.0.0.1:*'] : []),
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
 * CSP 리포트 URI 설정 (선택적)
 * Sentry나 별도의 CSP 리포트 수집 서비스로 위반 사항을 전송
 */
export function getCSPReportUri(): string | undefined {
  // 프로덕션에서만 CSP 위반 리포트 수집
  if (process.env.NODE_ENV === 'production') {
    if (process.env.CSP_REPORT_URI) {
      return process.env.CSP_REPORT_URI;
    }

    // Sentry DSN이 있으면 Sentry CSP 리포팅 사용
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const match = process.env.NEXT_PUBLIC_SENTRY_DSN.match(
        /https:\/\/(.+)@(.+)\.ingest\.sentry\.io\/(\d+)/
      );
      if (match) {
        const [, publicKey, _org, projectId] = match;
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
    // report-to (최신 표준) — Report-To 헤더는 별도로 설정해야 함
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
