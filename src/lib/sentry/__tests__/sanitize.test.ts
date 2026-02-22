import {
  createBeforeSendHandler,
  createBeforeTransactionHandler,
  sanitizeSentryEvent,
} from '../sanitize';

/**
 * Sentry Sanitization 테스트
 *
 * 민감정보 마스킹 로직 검증
 * @sentry/nextjs는 타입만 사용하므로 빈 모듈 모킹
 */

// @sentry/nextjs 모킹 (타입만 사용)
jest.mock('@sentry/nextjs', () => ({}));

const originalEnv = process.env.NODE_ENV;

afterEach(() => {
  Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
});

// ─── sanitizeSentryEvent ───────────────────────────────────────────

describe('sanitizeSentryEvent', () => {
  beforeEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
  });

  // Request sanitization
  describe('Request sanitization', () => {
    it('authorization 헤더 → [REDACTED]', () => {
      const event = {
        request: {
          headers: {
            authorization: 'Bearer eyJtoken...',
            'content-type': 'application/json',
          },
        },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.request!.headers!['authorization']).toBe('[REDACTED]');
      expect(result!.request!.headers!['content-type']).toBe('application/json');
    });

    it('cookie 헤더 → [REDACTED]', () => {
      const event = {
        request: {
          headers: {
            cookie: 'session=abc123; token=xyz',
          },
        },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.request!.headers!['cookie']).toBe('[REDACTED]');
    });

    it('cookies → [REDACTED]', () => {
      const event = {
        request: {
          cookies: { session: 'abc123' },
        },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.request!.cookies).toBe('[REDACTED]');
    });

    it('query_string 내 민감 필드 마스킹', () => {
      const event = {
        request: {
          query_string: { token: 'secret-value', page: '1' },
        },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.request!.query_string.token).toBe('[REDACTED]');
      expect(result!.request!.query_string.page).toBe('1');
    });

    it('body 내 password 필드 → [REDACTED]', () => {
      const event = {
        request: {
          data: { email: 'user@test.com', password: 'secret123' },
        },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.request!.data.password).toBe('[REDACTED]');
    });
  });

  // User sanitization
  describe('User sanitization', () => {
    it('이메일 마스킹', () => {
      const event = {
        user: { id: 'user-1', email: 'user@test.com' },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.user!.id).toBe('user-1');
      // user@test.com → u***@test.com
      expect(result!.user!.email).toBe('u***@test.com');
    });

    it('IP 마스킹', () => {
      const event = {
        user: { id: 'user-1', ip_address: '1.2.3.4' },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.user!.ip_address).toBe('1.2.xxx.xxx');
    });

    it('id만 유지', () => {
      const event = {
        user: { id: 'user-1' },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.user).toEqual({ id: 'user-1' });
    });
  });

  // 문자열 패턴 마스킹
  describe('문자열 패턴 마스킹', () => {
    it('JWT 토큰 → [JWT Token Redacted]', () => {
      const longJwt = 'eyJ' + 'a'.repeat(200);
      const event = {
        extra: { someField: longJwt },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.extra!.someField).toBe('[JWT Token Redacted]');
    });

    it('Base64 시크릿 → [Possible Secret Redacted]', () => {
      // 41자 이상의 Base64-like 문자열
      const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop==';
      const event = {
        extra: { key: base64 },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.extra!.key).toBe('[Possible Secret Redacted]');
    });
  });

  // ENV sanitization
  describe('ENV sanitization', () => {
    it('SUPABASE_KEY → [REDACTED]', () => {
      const event = {
        contexts: {
          runtime: {
            env: {
              SUPABASE_SERVICE_ROLE_KEY: 'secret-key',
              NODE_ENV: 'production',
            },
          },
        },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.contexts!.runtime.env.SUPABASE_SERVICE_ROLE_KEY).toBe('[REDACTED]');
      expect(result!.contexts!.runtime.env.NODE_ENV).toBe('production');
    });

    it('일반 환경변수 → 유지', () => {
      const event = {
        contexts: {
          runtime: {
            env: {
              APP_NAME: 'SeraphimON',
              PORT: '3000',
            },
          },
        },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.contexts!.runtime.env.APP_NAME).toBe('SeraphimON');
      expect(result!.contexts!.runtime.env.PORT).toBe('3000');
    });
  });

  // Breadcrumbs
  describe('Breadcrumbs', () => {
    it('data 내 민감 정보 마스킹', () => {
      const event = {
        breadcrumbs: [{ data: { password: 'secret', url: '/api/test' } }],
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.breadcrumbs![0].data.password).toBe('[REDACTED]');
      expect(result!.breadcrumbs![0].data.url).toBe('/api/test');
    });

    it('message 내 이메일 → [EMAIL]', () => {
      const event = {
        breadcrumbs: [{ message: 'User user@example.com logged in' }],
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.breadcrumbs![0].message).toBe('User [EMAIL] logged in');
    });
  });

  // Exception values
  describe('Exception values', () => {
    it('exception value 내 이메일/숫자 마스킹', () => {
      const event = {
        exception: {
          values: [{ type: 'Error', value: 'Failed for user@test.com with code 1234' }],
        },
      } as any;

      const result = sanitizeSentryEvent(event);
      expect(result!.exception!.values![0].value).toContain('[EMAIL]');
      expect(result!.exception!.values![0].value).toContain('[NUM]');
    });
  });

  // 개발 환경
  describe('환경 분기', () => {
    it('NODE_ENV=development → null 반환 (전송 차단)', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const event = { level: 'error', message: 'test' } as any;
      const result = sanitizeSentryEvent(event);

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('NODE_ENV=production → 이벤트 반환', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

      const event = { level: 'error', message: 'test' } as any;
      const result = sanitizeSentryEvent(event);

      expect(result).not.toBeNull();
      expect(result!.message).toBe('test');
    });
  });

  // Extra context
  it('extra context sanitization', () => {
    const event = {
      extra: {
        password: 'secret',
        debug: 'info',
      },
    } as any;

    const result = sanitizeSentryEvent(event);
    expect(result!.extra!.password).toBe('[REDACTED]');
    expect(result!.extra!.debug).toBe('info');
  });
});

// ─── createBeforeSendHandler ───────────────────────────────────────

describe('createBeforeSendHandler', () => {
  it('핸들러 함수 반환', () => {
    const handler = createBeforeSendHandler();
    expect(typeof handler).toBe('function');
  });

  it('sanitizeSentryEvent 호출', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

    const handler = createBeforeSendHandler();
    const event = { level: 'error', message: 'test' } as any;
    const hint = {} as any;

    const result = handler(event, hint);
    expect(result).not.toBeNull();
  });

  it('개발 환경에서 originalException 로깅', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const handler = createBeforeSendHandler();
    const event = { level: 'error' } as any;
    const hint = { originalException: new Error('test error') } as any;

    handler(event, hint);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });
});

// ─── createBeforeTransactionHandler ────────────────────────────────

describe('createBeforeTransactionHandler', () => {
  it('/users/uuid → /users/[ID]', () => {
    const handler = createBeforeTransactionHandler();
    const event = { transaction: '/users/550e8400-e29b-41d4-a716-446655440000' } as any;

    const result = handler(event);
    expect(result.transaction).toBe('/users/[ID]');
  });

  it('/api/auth/login → /api/auth/[ACTION]', () => {
    const handler = createBeforeTransactionHandler();
    const event = { transaction: '/api/auth/login' } as any;

    const result = handler(event);
    expect(result.transaction).toBe('/api/auth/[ACTION]');
  });

  it('query params 제거', () => {
    const handler = createBeforeTransactionHandler();
    const event = { transaction: '/api/data?token=secret&page=1' } as any;

    const result = handler(event);
    expect(result.transaction).toBe('/api/data');
  });
});
