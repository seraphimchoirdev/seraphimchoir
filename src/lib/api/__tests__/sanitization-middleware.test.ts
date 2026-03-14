/**
 * API Sanitization Middleware 테스트
 *
 * Zod 스키마 검증 + deepSanitizeObject + removeSensitiveFields
 */
import { z } from 'zod';

import { NextRequest } from 'next/server';

import {
  ValidationError,
  commonSchemas,
  removeSensitiveFields,
  sanitizeForSQL,
  sanitizeQueryParams,
  sanitizeRequestBody,
} from '../sanitization-middleware';

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

// ─── sanitizeRequestBody ───────────────────────────────────────────

describe('sanitizeRequestBody', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().optional(),
  });

  function createJsonRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('정상 JSON → 스키마 파싱 성공', async () => {
    const req = createJsonRequest({ name: 'Hong', age: 25 });
    const result = await sanitizeRequestBody(req, testSchema);

    expect(result).toEqual({ name: 'Hong', age: 25 });
  });

  it('HTML 태그 포함 → 제거 후 파싱', async () => {
    const req = createJsonRequest({ name: '<b>Hong</b>', age: 30 });
    const result = await sanitizeRequestBody(req, testSchema);

    expect(result.name).toBe('Hong');
  });

  it('Zod 검증 실패 → ValidationError throw', async () => {
    const req = createJsonRequest({ name: '', age: 25 });

    await expect(sanitizeRequestBody(req, testSchema)).rejects.toThrow(ValidationError);
  });

  it('잘못된 JSON → Error throw', async () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    await expect(sanitizeRequestBody(req, testSchema)).rejects.toThrow();
  });
});

// ─── sanitizeQueryParams ───────────────────────────────────────────

describe('sanitizeQueryParams', () => {
  const querySchema = z.object({
    page: z.coerce.number().optional(),
    name: z.string().optional(),
  });

  it('정상 쿼리 → 파싱 성공', () => {
    const params = new URLSearchParams({ page: '1', name: 'Hong' });
    const result = sanitizeQueryParams(params, querySchema);

    expect(result).toEqual({ page: 1, name: 'Hong' });
  });

  it('빈 값 → undefined 변환', () => {
    const params = new URLSearchParams({ page: '', name: 'Hong' });
    const result = sanitizeQueryParams(params, querySchema);

    expect(result.page).toBeUndefined();
    expect(result.name).toBe('Hong');
  });

  it('Zod 검증 실패 → ValidationError throw', () => {
    const strictSchema = z.object({
      required_field: z.string().min(1),
    });

    const params = new URLSearchParams({});

    expect(() => sanitizeQueryParams(params, strictSchema)).toThrow(ValidationError);
  });
});

// ─── removeSensitiveFields ─────────────────────────────────────────

describe('removeSensitiveFields', () => {
  it('password 필드 제거', () => {
    const data = { name: 'Hong', password: 'secret', email: 'test@test.com' };
    const result = removeSensitiveFields(data);

    expect(result).toEqual({ name: 'Hong', email: 'test@test.com' });
    expect(result).not.toHaveProperty('password');
  });

  it('중첩 객체의 token 필드 제거', () => {
    const data = {
      user: { name: 'Hong', token: 'jwt-token' },
      meta: { version: '1.0' },
    };

    const result = removeSensitiveFields(data);
    expect(result.user).not.toHaveProperty('token');
    expect(result.user).toHaveProperty('name', 'Hong');
  });

  it('배열 내 객체 처리', () => {
    const data = [
      { name: 'Hong', password: 'secret1' },
      { name: 'Kim', password: 'secret2' },
    ];

    const result = removeSensitiveFields(data);
    expect(result[0]).not.toHaveProperty('password');
    expect(result[1]).not.toHaveProperty('password');
    expect(result[0]).toHaveProperty('name', 'Hong');
  });

  it('커스텀 필드 목록 적용', () => {
    const data = { name: 'Hong', customSecret: 'value', email: 'test@test.com' };
    const result = removeSensitiveFields(data, ['customSecret']);

    expect(result).not.toHaveProperty('customSecret');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('email');
  });

  it('primitive 값 → 그대로 반환', () => {
    expect(removeSensitiveFields('hello')).toBe('hello');
    expect(removeSensitiveFields(42)).toBe(42);
    expect(removeSensitiveFields(null)).toBeNull();
    expect(removeSensitiveFields(undefined)).toBeUndefined();
  });
});

// ─── sanitizeForSQL ────────────────────────────────────────────────

describe('sanitizeForSQL', () => {
  it('SQL 위험 문자 sanitize', () => {
    const result = sanitizeForSQL("'; DROP TABLE users--");
    expect(result).not.toContain("'");
    expect(result).not.toContain(';');
    expect(result).not.toContain('--');
  });

  it('정상 문자열 보존', () => {
    const result = sanitizeForSQL('normal text 123');
    expect(result).toBe('normal text 123');
  });
});

// ─── ValidationError ───────────────────────────────────────────────

describe('ValidationError', () => {
  it('name="ValidationError", errors 배열 포함', () => {
    const issues: z.ZodIssue[] = [
      {
        code: 'too_small',
        minimum: 1,
        inclusive: true,
        type: 'string',
        message: 'Required',
        path: ['name'],
      },
    ];

    const error = new ValidationError('테스트 에러', issues);

    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('테스트 에러');
    expect(error.errors).toHaveLength(1);
    expect(error.errors[0].path).toEqual(['name']);
  });
});

// ─── commonSchemas ─────────────────────────────────────────────────

describe('commonSchemas', () => {
  it('email: 유효한 이메일 통과', () => {
    const result = commonSchemas.email.parse('User@Example.COM');
    expect(result).toBe('user@example.com');
  });

  it('email: 잘못된 이메일 → 에러', () => {
    expect(() => commonSchemas.email.parse('not-an-email')).toThrow();
  });

  it('name: 2자 미만 → 거부', () => {
    expect(() => commonSchemas.name.parse('A')).toThrow();
  });

  it('name: 유효한 이름 통과', () => {
    const result = commonSchemas.name.parse('홍길동');
    expect(result).toBe('홍길동');
  });

  it('id: UUID 통과', () => {
    const result = commonSchemas.id.parse('550e8400-e29b-41d4-a716-446655440000');
    expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('id: 숫자 통과', () => {
    const result = commonSchemas.id.parse('42');
    expect(result).toBe(42);
  });
});
