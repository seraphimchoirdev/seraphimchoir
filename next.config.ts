import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler 설정 (Next.js 16에서 최상위로 이동)
  reactCompiler: {
    compilationMode: 'annotation',
  },
  // @napi-rs/canvas는 native Node.js 모듈이라 번들링에서 제외
  serverExternalPackages: ['@napi-rs/canvas'],
};

export default nextConfig;
