import {
  assertEnvironmentValid,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  validateEnvironment,
} from '../env-validation';

/**
 * 환경변수 검증 유틸리티 테스트
 *
 * process.env 백업/복원 + typeof window 제어
 */

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

// process.env 백업/복원
const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

// ─── validateEnvironment (클라이언트 환경 — window 존재) ─────────────

describe('validateEnvironment', () => {
  it('모든 필수 env 설정 → isValid=true, errors=[]', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

    const result = validateEnvironment();
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('NEXT_PUBLIC_SUPABASE_URL 누락 → error', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'some-key';

    const result = validateEnvironment();
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('NEXT_PUBLIC_SUPABASE_URL'))).toBe(true);
  });

  it('NEXT_PUBLIC_SUPABASE_ANON_KEY 누락 → error', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const result = validateEnvironment();
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'))).toBe(true);
  });
});

// ─── assertEnvironmentValid ────────────────────────────────────────

describe('assertEnvironmentValid', () => {
  it('유효 환경 → 예외 없음', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'some-key';

    expect(() => assertEnvironmentValid()).not.toThrow();
  });

  it('필수 env 누락 → throw Error', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => assertEnvironmentValid()).toThrow('환경변수 검증 실패');
  });
});

// ─── getSupabaseUrl ────────────────────────────────────────────────

describe('getSupabaseUrl', () => {
  it('설정됨 → URL 반환', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    expect(getSupabaseUrl()).toBe('https://test.supabase.co');
  });

  it('미설정 → throw Error', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => getSupabaseUrl()).toThrow('NEXT_PUBLIC_SUPABASE_URL');
  });
});

// ─── getSupabaseAnonKey ────────────────────────────────────────────

describe('getSupabaseAnonKey', () => {
  it('설정됨 → key 반환', () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    expect(getSupabaseAnonKey()).toBe('test-anon-key');
  });

  it('미설정 → throw Error', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => getSupabaseAnonKey()).toThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });
});

// ─── getSupabaseServiceRoleKey ─────────────────────────────────────

describe('getSupabaseServiceRoleKey', () => {
  it('설정됨 → key 반환', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    expect(getSupabaseServiceRoleKey()).toBe('test-service-role-key');
  });

  it('미설정 → throw Error', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => getSupabaseServiceRoleKey()).toThrow('SUPABASE_SERVICE_ROLE_KEY');
  });
});
