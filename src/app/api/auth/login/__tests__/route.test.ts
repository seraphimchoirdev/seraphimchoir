/**
 * POST /api/auth/login 통합 테스트
 */
import {
  createTestRequest,
  setupAuthenticatedSupabase,
} from '@/__tests__/helpers/api-route-helpers';
import { createClient } from '@/lib/supabase/server';

import { POST } from '../route';

// rate-limiter 모킹
jest.mock('@/lib/security/rate-limiter', () => ({
  authRateLimiter: {
    limit: jest.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }),
  },
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  createRateLimitErrorResponse: jest.fn().mockReturnValue({ error: 'Rate limit exceeded' }),
}));

// audit-logger 모킹
jest.mock('@/lib/security/audit-logger', () => ({
  logLoginEvent: jest.fn().mockResolvedValue(undefined),
  logRateLimitExceeded: jest.fn().mockResolvedValue(undefined),
}));

// sanitization-middleware는 실제 로직 사용하되 request.json() 호출 필요
// → 대신 모킹하여 직접 파싱된 데이터 반환
jest.mock('@/lib/api/sanitization-middleware', () => ({
  sanitizeRequestBody: jest.fn(),
}));

import { sanitizeRequestBody } from '@/lib/api/sanitization-middleware';
const mockSanitize = sanitizeRequestBody as jest.Mock;

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('정상 로그인 200', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' };
    const mockSession = { access_token: 'token-123' };

    mockSanitize.mockResolvedValue({
      email: 'test@test.com',
      password: 'password123',
    });

    const mockClient = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'ADMIN' },
              error: null,
            }),
          }),
        }),
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockClient);

    const request = createTestRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user.email).toBe('test@test.com');
    expect(body.session).toBeTruthy();
    expect(body.message).toBe('로그인에 성공했습니다.');
  });

  it('잘못된 이메일/비밀번호 → 401', async () => {
    mockSanitize.mockResolvedValue({
      email: 'wrong@test.com',
      password: 'wrongpass',
    });

    const mockClient = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        }),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockClient);

    const request = createTestRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'wrong@test.com', password: 'wrongpass' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('이메일 또는 비밀번호가 올바르지 않습니다');
  });

  it('빈 입력 (검증 실패) → 400', async () => {
    const { z } = await import('zod');
    const zodError = new z.ZodError([
      {
        code: 'too_small',
        minimum: 1,
        type: 'string',
        inclusive: true,
        exact: false,
        message: '올바른 이메일 형식이 아닙니다',
        path: ['email'],
      },
    ]);
    mockSanitize.mockRejectedValue(zodError);

    const request = createTestRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
