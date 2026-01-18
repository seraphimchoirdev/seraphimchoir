/**
 * Next.js 16 Instrumentation API
 *
 * 애플리케이션 시작 시 Sentry를 초기화합니다.
 * 서버, 클라이언트, Edge Runtime 모두 지원합니다.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // 서버 또는 Edge Runtime에서만 실행
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Node.js 서버 환경
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge Runtime 환경 (Middleware 등)
    await import('./sentry.edge.config');
  }
}

// 클라이언트는 자동으로 sentry.client.config.ts를 로드합니다.
