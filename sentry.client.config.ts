/**
 * Sentry 클라이언트 설정
 *
 * 브라우저에서 발생하는 에러를 Sentry로 전송합니다.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 환경별 설정 (development/production)
  environment: process.env.NODE_ENV,

  // 트레이스 샘플링 비율 (0.0 ~ 1.0)
  // 프로덕션: 10% 트랜잭션만 전송 (무료 티어 한도 고려)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 세션 재생 샘플링 비율 (0.0 ~ 1.0)
  // 에러 발생 시 세션을 100% 재생, 일반 세션은 10%만 재생
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // 통합 기능 설정
  integrations: [
    Sentry.replayIntegration({
      // 민감한 정보 마스킹 (텍스트, 미디어)
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // 에러 전송 전 필터링 (민감한 정보 제거)
  beforeSend(event, hint) {
    // 개발 환경에서는 콘솔에만 출력하고 전송하지 않음
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry Event (dev):', event);
      console.error('Original Error:', hint.originalException);
      return null; // 전송하지 않음
    }

    // 민감한 정보 필터링 (예: 이메일, 토큰 등)
    if (event.request) {
      // 쿠키 제거
      delete event.request.cookies;

      // Authorization 헤더 제거
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
    }

    return event;
  },

  // 무시할 에러 패턴
  ignoreErrors: [
    // 브라우저 확장 프로그램 에러
    'top.GLOBALS',
    'Non-Error promise rejection captured',
    // 네트워크 에러 (사용자 인터넷 끊김 등)
    'Network request failed',
    'Failed to fetch',
  ],
});
