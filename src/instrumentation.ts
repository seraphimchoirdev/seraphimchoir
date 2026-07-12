import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');

    // 환경변수 검증을 부팅 시점에 수행 — 설정 오류가 첫 사용자 요청이 아니라
    // 배포 로그에서 바로 드러나도록 한다. (서비스 중단을 피하기 위해 throw 대신 로그)
    const { validateEnvironment } = await import('@/lib/env-validation');
    const result = validateEnvironment();
    if (!result.isValid) {
      console.error('[Instrumentation] 환경변수 검증 실패:\n' + result.errors.join('\n'));
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
