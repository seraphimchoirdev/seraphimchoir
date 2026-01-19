/**
 * Rate Limiting 유틸리티 (Upstash Redis 기반)
 *
 * DDoS 공격, 무차별 대입 공격, 스팸 방어를 위한 요청 제한
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'RateLimiter' });

/**
 * Upstash Redis 클라이언트 생성
 * 환경 변수가 없으면 null 반환 (개발 환경용)
 */
function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.warn(
      'Upstash Redis 환경 변수가 설정되지 않았습니다. Rate limiting이 비활성화됩니다. ' +
      '프로덕션 환경에서는 UPSTASH_REDIS_REST_URL과 UPSTASH_REDIS_REST_TOKEN을 설정하세요.'
    );
    return null;
  }

  return new Redis({
    url,
    token,
  });
}

const redis = createRedisClient();

/**
 * Rate Limiter가 비활성화된 경우 (개발 환경)
 * 항상 성공을 반환하는 더미 객체
 */
const disabledRateLimiter = {
  limit: async () => ({
    success: true,
    limit: Infinity,
    remaining: Infinity,
    reset: 0,
    pending: Promise.resolve(),
  }),
};

/**
 * 인증 관련 API Rate Limiter (로그인, 회원가입)
 *
 * 제한: 5회/분
 * 목적: 무차별 대입 공격(brute force) 방어
 *
 * @example
 * const { success } = await authRateLimiter.limit(ip);
 * if (!success) {
 *   return NextResponse.json({ error: '너무 많은 요청입니다.' }, { status: 429 });
 * }
 */
export const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'), // 5회/분
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : disabledRateLimiter;

/**
 * 회원가입 전용 Rate Limiter (더 엄격)
 *
 * 제한: 3회/분
 * 목적: 스팸 계정 생성 방지
 *
 * @example
 * const { success } = await signupRateLimiter.limit(ip);
 * if (!success) {
 *   return NextResponse.json({ error: '너무 많은 요청입니다.' }, { status: 429 });
 * }
 */
export const signupRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 m'), // 3회/분
      analytics: true,
      prefix: 'ratelimit:signup',
    })
  : disabledRateLimiter;

/**
 * 일반 API Rate Limiter
 *
 * 제한: 100회/분
 * 목적: 일반적인 DDoS 공격 및 과도한 요청 방어
 *
 * @example
 * const { success } = await apiRateLimiter.limit(ip);
 * if (!success) {
 *   return NextResponse.json({ error: '너무 많은 요청입니다.' }, { status: 429 });
 * }
 */
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'), // 100회/분
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : disabledRateLimiter;

/**
 * NextRequest에서 클라이언트 IP 추출
 *
 * Vercel/Next.js에서 사용 가능한 헤더 순서대로 확인:
 * 1. x-forwarded-for (Vercel, Cloudflare 등)
 * 2. x-real-ip (Nginx 등)
 * 3. 'anonymous' (fallback)
 *
 * @param request - NextRequest 객체
 * @returns 클라이언트 IP 주소 (없으면 'anonymous')
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;

  // x-forwarded-for 헤더 확인 (여러 프록시를 거칠 경우 첫 번째 IP)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  // x-real-ip 헤더 확인
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // IP를 찾을 수 없으면 'anonymous' 반환
  return 'anonymous';
}

/**
 * Rate Limiter 상태 확인
 *
 * @returns Rate limiting이 활성화되어 있는지 여부
 */
export function isRateLimitingEnabled(): boolean {
  return redis !== null;
}

/**
 * Rate Limit 에러 응답 생성 헬퍼
 *
 * @param resetTime - Rate limit이 리셋되는 시간 (밀리초)
 * @returns NextResponse 객체
 */
export function createRateLimitErrorResponse(resetTime: number = 60) {
  return {
    error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
    retryAfter: Math.ceil(resetTime / 1000), // 초 단위로 변환
  };
}

/**
 * Redis 연결 상태 확인 (헬스체크)
 *
 * @returns Redis 연결 상태 및 정보
 */
export async function checkRedisConnection(): Promise<{
  isConnected: boolean;
  isProduction: boolean;
  error?: string;
}> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!redis) {
    return {
      isConnected: false,
      isProduction,
      error: 'Redis client not initialized. Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN',
    };
  }

  try {
    // Redis PING 명령으로 연결 확인
    await redis.ping();
    return {
      isConnected: true,
      isProduction,
    };
  } catch (error) {
    logger.error('Redis connection check failed:', error);
    return {
      isConnected: false,
      isProduction,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 프로덕션 환경에서 Rate Limiting 필수 검증
 * 애플리케이션 시작 시 호출하여 프로덕션 안전성 확보
 */
export async function validateRateLimitingForProduction(): Promise<void> {
  const status = await checkRedisConnection();

  if (status.isProduction && !status.isConnected) {
    const errorMessage =
      '🚨 Rate Limiting 검증 실패!\n\n' +
      'Production 환경에서 Rate Limiting이 활성화되지 않았습니다.\n' +
      `에러: ${status.error}\n\n` +
      'Upstash Redis 설정을 확인하세요:\n' +
      '1. https://console.upstash.com 에서 Redis 데이터베이스 생성\n' +
      '2. UPSTASH_REDIS_REST_URL과 UPSTASH_REDIS_REST_TOKEN을 .env에 설정\n\n' +
      '개발 환경에서 테스트하려면 NODE_ENV=development로 설정하세요.';

    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (status.isConnected) {
    logger.info('✅ Rate Limiting이 정상적으로 활성화되었습니다.');
  } else {
    logger.warn('⚠️ Rate Limiting이 비활성화되었습니다 (개발 환경).');
  }
}
