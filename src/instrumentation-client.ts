/**
 * Sentry 클라이언트 Instrumentation
 *
 * Next.js 16에서 클라이언트 사이드 Sentry 초기화를 담당합니다.
 * 실제 설정은 루트의 sentry.client.config.ts에서 가져옵니다.
 */

import * as Sentry from '@sentry/nextjs';

// 루트의 sentry.client.config.ts를 로드 (DSN, ignoreErrors, sanitize 등 포함)
import '../sentry.client.config';

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
