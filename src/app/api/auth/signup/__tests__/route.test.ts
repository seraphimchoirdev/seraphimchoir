/**
 * POST /api/auth/signup 통합 테스트
 */
import { createTestRequest } from '@/__tests__/helpers/api-route-helpers';
import { createClient } from '@/lib/supabase/server';

import { POST } from '../route';

// rate-limiter 모킹
jest.mock('@/lib/security/rate-limiter', () => ({
  signupRateLimiter: {
    limit: jest.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }),
  },
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  createRateLimitErrorResponse: jest.fn().mockReturnValue({ error: 'Rate limit exceeded' }),
}));

// sanitization-middleware 모킹
jest.mock('@/lib/api/sanitization-middleware', () => ({
  sanitizeRequestBody: jest.fn(),
}));

import { sanitizeRequestBody } from '@/lib/api/sanitization-middleware';
const mockSanitize = sanitizeRequestBody as jest.Mock;

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('정상 회원가입 201', async () => {
    const mockUser = { id: 'new-user-1', email: 'new@test.com' };
    const mockSession = { access_token: 'new-token' };

    mockSanitize.mockResolvedValue({
      email: 'new@test.com',
      password: 'StrongP@ss123',
      name: '새사용자',
    });

    const mockClient = {
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        }),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockClient);

    const request = createTestRequest('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@test.com',
        password: 'StrongP@ss123',
        name: '새사용자',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.user.email).toBe('new@test.com');
    expect(body.message).toBe('회원가입이 완료되었습니다.');
  });

  it('이미 존재하는 이메일 → 409', async () => {
    mockSanitize.mockResolvedValue({
      email: 'existing@test.com',
      password: 'StrongP@ss123',
      name: '기존사용자',
    });

    const mockClient = {
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'User already registered' },
        }),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockClient);

    const request = createTestRequest('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'existing@test.com',
        password: 'StrongP@ss123',
        name: '기존사용자',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe('이미 가입된 이메일입니다.');
  });

  it('유효하지 않은 입력 → 400', async () => {
    const { z } = await import('zod');
    const zodError = new z.ZodError([
      {
        code: 'too_small',
        minimum: 12,
        type: 'string',
        inclusive: true,
        exact: false,
        message: '비밀번호는 최소 12자 이상이어야 합니다',
        path: ['password'],
      },
    ]);
    mockSanitize.mockRejectedValue(zodError);

    const request = createTestRequest('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'short',
        name: '테스트',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('비밀번호는 최소 12자');
  });
});
