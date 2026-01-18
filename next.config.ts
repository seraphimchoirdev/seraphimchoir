import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

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
    return [
      {
        source: '/:path*',
        headers: [
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
          // Content Security Policy (CSP)
          // - default-src 'self': 기본적으로 같은 도메인만 허용
          // - script-src: Next.js의 인라인 스크립트와 외부 스크립트 허용
          // - style-src: Tailwind CSS와 인라인 스타일 허용
          // - img-src: 이미지는 자체 도메인 + Supabase Storage + data: URI 허용
          // - connect-src: API 요청은 자체 도메인 + Supabase API 허용
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js 개발 모드를 위해 unsafe-eval, unsafe-inline 허용
              "style-src 'self' 'unsafe-inline'", // Tailwind CSS를 위해 unsafe-inline 허용
              "img-src 'self' data: https://*.supabase.co blob:", // Supabase Storage 이미지 허용
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co", // Supabase API/Realtime 허용
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
