/**
 * API Request Sanitization 미들웨어
 *
 * 모든 API 엔드포인트에서 사용할 수 있는 공통 sanitization 유틸리티
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sanitizers } from '@/lib/security/input-sanitizer';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'APISanitization' });

/**
 * Request body를 안전하게 파싱하고 sanitize
 *
 * @param request - NextRequest 객체
 * @param schema - Zod 스키마 (sanitization 변환 포함)
 * @returns 파싱되고 sanitize된 데이터
 */
export async function sanitizeRequestBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<z.infer<T>> {
  try {
    const rawBody = await request.json();

    // Deep sanitize: 모든 문자열 필드에서 기본적인 XSS 방어
    const sanitizedBody = deepSanitizeObject(rawBody);

    // Zod 스키마로 검증 및 추가 변환
    const parsed = schema.parse(sanitizedBody);

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Request validation failed:', error.issues);
      throw new ValidationError('입력 데이터가 유효하지 않습니다', error.issues);
    }
    throw error;
  }
}

/**
 * Query parameters를 안전하게 파싱하고 sanitize
 *
 * @param searchParams - URLSearchParams 객체
 * @param schema - Zod 스키마
 * @returns 파싱되고 sanitize된 쿼리 파라미터
 */
export function sanitizeQueryParams<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  // URLSearchParams를 객체로 변환
  const params: Record<string, string | undefined> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // null 값을 undefined로 변환 (Zod 호환성)
  Object.keys(params).forEach(key => {
    if (params[key] === null || params[key] === '') {
      params[key] = undefined;
    }
  });

  try {
    // Deep sanitize 적용
    const sanitizedParams = deepSanitizeObject(params);

    // Zod 스키마로 검증 및 변환
    return schema.parse(sanitizedParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Query params validation failed:', error.issues);
      throw new ValidationError('쿼리 파라미터가 유효하지 않습니다', error.issues);
    }
    throw error;
  }
}

/**
 * 객체의 모든 문자열 필드를 재귀적으로 sanitize
 *
 * @param obj - sanitize할 객체
 * @returns sanitize된 객체
 */
function deepSanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    // 기본적인 HTML 태그 제거
    return sanitizers.stripHtml(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // 키 자체도 sanitize (prototype pollution 방어)
      const sanitizedKey = key.replace(/[^\w.-]/g, '');
      sanitized[sanitizedKey] = deepSanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * 공통 Zod 스키마 with sanitization transforms
 */
export const commonSchemas = {
  // 이메일 필드
  email: z.string()
    .email('올바른 이메일 형식이 아닙니다')
    .transform(v => {
      const sanitized = sanitizers.sanitizeEmail(v);
      if (!sanitized) {
        throw new Error('올바른 이메일 형식이 아닙니다');
      }
      return sanitized;
    }),

  // 이름 필드 (한글/영문만 허용)
  name: z.string()
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(50, '이름은 최대 50자까지 입력 가능합니다')
    .transform(sanitizers.sanitizeMemberName),

  // 전화번호 필드
  phoneNumber: z.string()
    .nullable()
    .optional()
    .transform(v => v ? sanitizers.sanitizePhoneNumber(v) : null),

  // 일반 텍스트 필드 (노트, 설명 등)
  textNote: z.string()
    .nullable()
    .optional()
    .transform(v => v ? sanitizers.sanitizeTextNote(v, 1000) : null),

  // URL 필드
  url: z.string()
    .transform(v => sanitizers.sanitizeUrl(v)),

  // ID 필드 (UUID 또는 숫자)
  id: z.union([
    z.string().uuid(),
    z.coerce.number().int().positive()
  ]),

  // 페이지네이션
  pagination: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    page: z.coerce.number().int().min(1).optional(),
  }),

  // 정렬
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
} as const;

/**
 * 커스텀 에러 클래스
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * API Response에서 민감한 정보 제거
 *
 * @param data - 응답 데이터
 * @param sensitiveFields - 제거할 필드 목록
 * @returns 민감한 정보가 제거된 데이터
 */
export function removeSensitiveFields(
  data: any,
  sensitiveFields: string[] = ['password', 'token', 'secret', 'apiKey']
): any {
  if (Array.isArray(data)) {
    return data.map(item => removeSensitiveFields(item, sensitiveFields));
  }

  if (data !== null && typeof data === 'object') {
    const cleaned = { ...data };
    for (const field of sensitiveFields) {
      if (field in cleaned) {
        delete cleaned[field];
      }
    }

    // 중첩된 객체도 재귀적으로 처리
    for (const [key, value] of Object.entries(cleaned)) {
      if (value !== null && typeof value === 'object') {
        cleaned[key] = removeSensitiveFields(value, sensitiveFields);
      }
    }

    return cleaned;
  }

  return data;
}

/**
 * SQL Injection 방어를 위한 추가 검증
 *
 * @param value - 검증할 값
 * @returns sanitize된 값
 */
export function sanitizeForSQL(value: string): string {
  return sanitizers.sanitizeSqlInput(value);
}