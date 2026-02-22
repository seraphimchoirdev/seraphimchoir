/**
 * @jest-environment node
 */

/* eslint-disable import/order, import/first */

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

import { validateEnvironment } from '../env-validation';

/**
 * 환경변수 검증 유틸리티 — 서버 환경 테스트
 *
 * node 환경으로 실행하여 typeof window === 'undefined' 보장
 * 서버 전용 검증 로직 (SERVER_ENV_VARS) 테스트
 */

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('validateEnvironment (서버 환경)', () => {
  it('CONDUCTOR_NOTES_ENCRYPTION_KEY 길이 오류 → error', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'some-key';
    process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY = 'tooshort';

    const result = validateEnvironment();
    expect(
      result.errors.some(
        (e) => e.includes('CONDUCTOR_NOTES_ENCRYPTION_KEY') && e.includes('64자리')
      )
    ).toBe(true);
  });

  it('CONDUCTOR_NOTES_ENCRYPTION_KEY 비hex 문자 → error', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'some-key';
    process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY = 'g'.repeat(64);

    const result = validateEnvironment();
    expect(result.errors.some((e) => e.includes('16진수'))).toBe(true);
  });

  it('프로덕션 + UPSTASH 미설정 → error', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'some-key';
    process.env.NODE_ENV = 'production';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = validateEnvironment();
    expect(result.errors.some((e) => e.includes('UPSTASH_REDIS_REST_URL'))).toBe(true);
    expect(result.errors.some((e) => e.includes('UPSTASH_REDIS_REST_TOKEN'))).toBe(true);
  });

  it('개발 환경 + UPSTASH 미설정 → warning만', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'some-key';
    process.env.NODE_ENV = 'development';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = validateEnvironment();
    expect(result.warnings.some((w) => w.includes('UPSTASH_REDIS_REST_URL'))).toBe(true);
    expect(result.errors.some((e) => e.includes('UPSTASH_REDIS_REST_URL'))).toBe(false);
  });

  it('유효한 64자리 hex CONDUCTOR_NOTES_ENCRYPTION_KEY → 에러 없음', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'some-key';
    process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY = 'a'.repeat(64);

    const result = validateEnvironment();
    expect(
      result.errors.some((e) => e.includes('CONDUCTOR_NOTES_ENCRYPTION_KEY'))
    ).toBe(false);
  });
});
