/**
 * Sentry 서버 설정
 *
 * Next.js 서버 및 API Routes에서 발생하는 에러를 Sentry로 전송합니다.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 환경별 설정 (development/production)
  environment: process.env.NODE_ENV,

  // 트레이스 샘플링 비율 (0.0 ~ 1.0)
  // 서버는 클라이언트보다 높은 샘플링 비율 사용 (API 성능 모니터링)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // 통합 기능 설정
  integrations: [
    // HTTP 요청 추적
    Sentry.httpIntegration(),
  ],

  // 에러 전송 전 필터링 (민감한 정보 제거)
  beforeSend(event, hint) {
    // 개발 환경에서는 콘솔에만 출력하고 전송하지 않음
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry Event (dev):', event);
      console.error('Original Error:', hint.originalException);
      return null; // 전송하지 않음
    }

    // 민감한 정보 필터링
    if (event.request) {
      // 환경 변수 제거 (SUPABASE_SERVICE_ROLE_KEY 등)
      if (event.contexts?.runtime?.environment) {
        delete event.contexts.runtime.environment;
      }

      // Authorization 헤더 제거
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      // 쿼리 파라미터에서 토큰 제거
      if (event.request.query_string && typeof event.request.query_string === 'string') {
        event.request.query_string = event.request.query_string
          .replace(/([?&])(token|key|password)=[^&]*/gi, '$1$2=***')
          .replace(/([?&])(email)=[^&]*/gi, '$1$2=***@***.***');
      }
    }

    // 요청 바디에서 민감한 필드 제거
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      if (typeof data === 'object' && data !== null) {
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
        sensitiveFields.forEach((field) => {
          if (field in data) {
            data[field] = '***';
          }
        });
      }
    }

    return event;
  },

  // 무시할 에러 패턴
  ignoreErrors: [
    // Next.js 자체 에러 (프레임워크 내부 에러)
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    // Supabase Auth 예상 에러 (잘못된 자격증명 등)
    'Invalid login credentials',
    'Email not confirmed',
  ],
});
