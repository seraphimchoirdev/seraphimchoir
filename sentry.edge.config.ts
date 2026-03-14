/**
 * Sentry Edge 설정
 *
 * Edge 런타임(미들웨어, Edge Routes)에서 발생하는 에러를 Sentry로 전송합니다.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 환경별 설정
  environment: process.env.NODE_ENV,

  // 트레이스 샘플링 비율 (프로덕션: 10%)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 로그 전송 활성화
  enableLogs: true,

  // PII 전송 비활성화 (개인정보 보호)
  sendDefaultPii: false,
});
