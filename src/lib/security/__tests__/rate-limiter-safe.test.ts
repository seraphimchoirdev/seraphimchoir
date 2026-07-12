jest.mock('@upstash/ratelimit', () => {
  class Ratelimit {}
  (Ratelimit as unknown as { slidingWindow: () => null }).slidingWindow = () => null;
  return { Ratelimit };
});
jest.mock('@upstash/redis', () => ({ Redis: class {} }));

import { safeLimit } from '@/lib/security/rate-limiter';

describe('safeLimit (fail-open)', () => {
  it('limiter가 정상이면 결과를 그대로 반환한다', async () => {
    const limiter = { limit: jest.fn().mockResolvedValue({ success: false, reset: 42 }) };
    await expect(safeLimit(limiter, 'ip')).resolves.toEqual({ success: false, reset: 42 });
  });

  it('limiter가 예외를 던지면(인프라 장애) 요청을 허용한다', async () => {
    // 2026-07-12 프로덕션 사고 회귀 테스트: Upstash 인스턴스 삭제(DNS ENOTFOUND)로
    // limiter가 throw → 로그인 전체가 500으로 실패했음. fail-open이어야 한다.
    const limiter = { limit: jest.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND')) };
    await expect(safeLimit(limiter, 'ip')).resolves.toEqual({ success: true, reset: 0 });
  });
});
