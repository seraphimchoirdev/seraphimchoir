import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // React Compiler 설정 (Next.js 16에서 최상위로 이동)
  reactCompiler: {
    compilationMode: 'annotation',
  },
  // @napi-rs/canvas는 native Node.js 모듈이라 번들링에서 제외
  serverExternalPackages: ['@napi-rs/canvas'],

  // 트리 쉐이킹 최적화 - barrel export 자동 변환
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
      'lodash-es',
      '@tanstack/react-query',
    ],
  },

  // modularizeImports - 라이브러리별 개별 임포트 경로 변환
  modularizeImports: {
    // lodash 최적화 (사용 시)
    'lodash': {
      transform: 'lodash/{{member}}',
    },
  },

  // 보안 헤더 설정
  async headers() {
    // 개발 환경과 프로덕션 환경에서 다른 CSP 정책 적용
    const isDevelopment = process.env.NODE_ENV === 'development';

    // CSP 헤더 생성 (프로덕션에서는 미들웨어에서 nonce 추가)
    const cspValue = isDevelopment
      ? [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // 개발: Next.js 개발 도구 지원
          "style-src 'self' 'unsafe-inline'", // 개발: Tailwind JIT 지원
          "img-src 'self' data: https://*.supabase.co blob:",
          "font-src 'self' data:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://*.upstash.com",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
      : ''; // 프로덕션: 미들웨어에서 nonce와 함께 설정

    const headers = [
      // XSS 공격 방어: 콘텐츠 타입 스니핑 차단
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      // Clickjacking 공격 방어: iframe 삽입 차단
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      // XSS 필터 활성화 (구형 브라우저 대응)
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      // Referrer 정보 제한
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      // 권한 정책: 불필요한 브라우저 기능 비활성화
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
    ];

    // 개발 환경에서만 CSP 헤더 추가 (프로덕션은 미들웨어에서 처리)
    if (isDevelopment && cspValue) {
      headers.push({
        key: 'Content-Security-Policy',
        value: cspValue,
      });
    }

    return [
      {
        source: '/:path*',
        headers,
      },
    ];
  },
};

// Sentry 설정 옵션
const sentryConfig = {
  // Sentry 설정 파일 자동 로드
  // - sentry.client.config.ts
  // - sentry.server.config.ts
  // - sentry.edge.config.ts
  silent: true, // 빌드 로그 최소화

  // 소스맵 업로드 설정 (프로덕션 디버깅용)
  // 프로덕션 환경에서만 소스맵 업로드 (SENTRY_AUTH_TOKEN 필요)
  widenClientFileUpload: true,
  hideSourceMaps: true, // 프로덕션 빌드에서 소스맵 숨김
  disableLogger: true, // Sentry 로거 비활성화

  // 자동 계측 설정
  automaticVercelMonitors: true, // Vercel 배포 시 자동 모니터링
};

export default withSentryConfig(
  withBundleAnalyzer(nextConfig),
  sentryConfig
);
