/**
 * Sentry Edge Runtime 설정
 *
 * Next.js Middleware 및 Edge Functions에서 발생하는 에러를 Sentry로 전송합니다.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 환경별 설정 (development/production)
  environment: process.env.NODE_ENV,

  // 트레이스 샘플링 비율 (0.0 ~ 1.0)
  // Edge Runtime은 가볍게 유지 (낮은 샘플링 비율)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 에러 전송 전 필터링 (민감한 정보 제거)
  beforeSend(event, hint) {
    // 개발 환경에서는 콘솔에만 출력하고 전송하지 않음
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry Event (edge/dev):', event);
      console.error('Original Error:', hint.originalException);
      return null; // 전송하지 않음
    }

    // 민감한 정보 필터링
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }

    return event;
  },

  // 무시할 에러 패턴
  ignoreErrors: [
    // Next.js 라우팅 에러
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],
});
