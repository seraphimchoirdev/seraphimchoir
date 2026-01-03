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
};

export default withBundleAnalyzer(nextConfig);
