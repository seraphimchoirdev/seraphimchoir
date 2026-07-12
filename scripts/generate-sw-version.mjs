/**
 * 서비스워커 캐시 버전 스탬핑 (Vercel 빌드 전용)
 *
 * public/sw.js의 BUILD_VERSION을 커밋 SHA로 치환해 배포마다
 * 캐시명이 갱신되도록 한다. 로컬 빌드에서는 워킹트리를 더럽히지 않도록 건너뜀.
 */
import fs from 'node:fs';
import path from 'node:path';

if (!process.env.VERCEL) {
  console.log('[sw-version] 로컬 빌드 — 버전 스탬핑 건너뜀 (BUILD_VERSION=dev 유지)');
  process.exit(0);
}

const swPath = path.join(process.cwd(), 'public', 'sw.js');
const version = (process.env.VERCEL_GIT_COMMIT_SHA || `t${Date.now()}`).slice(0, 12);

const src = fs.readFileSync(swPath, 'utf-8');
const marker = "const BUILD_VERSION = 'dev';";

if (!src.includes(marker)) {
  console.error('[sw-version] BUILD_VERSION 마커를 찾지 못했습니다 — sw.js 확인 필요');
  process.exit(1);
}

fs.writeFileSync(swPath, src.replace(marker, `const BUILD_VERSION = '${version}';`));
console.log(`[sw-version] sw.js 캐시 버전 스탬핑 완료: ${version}`);
