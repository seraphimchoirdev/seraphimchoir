import { ZodError } from 'zod';

import { NextResponse } from 'next/server';

import { logger } from './logger';

/**
 * API 에러 코드
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'VERSION_CONFLICT'
  | 'DUPLICATE_ENTRY'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST';

/**
 * API 에러 클래스
 * 일관된 에러 응답을 위해 사용
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: ApiErrorCode = 'INTERNAL_ERROR',
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * 401 Unauthorized
   */
  static unauthorized(message = '인증이 필요합니다'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  /**
   * 403 Forbidden
   */
  static forbidden(message = '권한이 없습니다'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  /**
   * 404 Not Found
   */
  static notFound(resource = '리소스'): ApiError {
    return new ApiError(404, `${resource}를 찾을 수 없습니다`, 'NOT_FOUND');
  }

  /**
   * 400 Bad Request
   */
  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  /**
   * 400 Validation Error
   */
  static validation(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, 'VALIDATION_ERROR', details);
  }

  /**
   * 409 Version Conflict
   */
  static versionConflict(
    message = '다른 사용자가 데이터를 수정했습니다. 새로고침 후 다시 시도해주세요.'
  ): ApiError {
    return new ApiError(409, message, 'VERSION_CONFLICT');
  }

  /**
   * 409 Duplicate Entry
   */
  static duplicate(message = '이미 존재하는 항목입니다'): ApiError {
    return new ApiError(409, message, 'DUPLICATE_ENTRY');
  }

  /**
   * 500 Internal Server Error
   */
  static internal(message = '서버 오류가 발생했습니다'): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}

/**
 * API 에러 응답 인터페이스
 */
export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
  details?: unknown;
}

/**
 * 에러를 처리하고 적절한 NextResponse 반환
 *
 * @param error - 처리할 에러
 * @param context - 로깅을 위한 컨텍스트 (예: 'GET /api/members')
 * @returns NextResponse with error details
 */
export function handleApiError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
  // ApiError 인스턴스인 경우
  if (error instanceof ApiError) {
    if (error.statusCode >= 500) {
      logger.error(`${context || 'API Error'}:`, error.message, error.details);
    } else {
      logger.debug(`${context || 'API Error'}:`, error.message);
    }

    const responseBody: ApiErrorResponse = {
      error: error.message,
      code: error.code,
    };
    if (error.details) {
      responseBody.details = error.details;
    }
    return NextResponse.json<ApiErrorResponse>(responseBody, { status: error.statusCode });
  }

  // Zod 검증 에러인 경우
  if (error instanceof ZodError) {
    logger.debug(`${context || 'Validation Error'}:`, error.issues);

    return NextResponse.json(
      {
        error: '입력값이 올바르지 않습니다',
        code: 'VALIDATION_ERROR' as ApiErrorCode,
        details: error.issues,
      },
      { status: 400 }
    );
  }

  // 일반 Error 인스턴스인 경우
  if (error instanceof Error) {
    logger.error(`${context || 'Unexpected Error'}:`, error.message, error.stack);

    // 프로덕션에서는 내부 에러 메시지를 노출하지 않음
    const isProduction = process.env.NODE_ENV === 'production';

    return NextResponse.json(
      {
        error: isProduction ? '서버 오류가 발생했습니다' : error.message,
        code: 'INTERNAL_ERROR' as ApiErrorCode,
      },
      { status: 500 }
    );
  }

  // 알 수 없는 에러인 경우
  logger.error(`${context || 'Unknown Error'}:`, error);

  return NextResponse.json(
    {
      error: '서버 오류가 발생했습니다',
      code: 'INTERNAL_ERROR' as ApiErrorCode,
    },
    { status: 500 }
  );
}

/**
 * 에러 핸들링을 포함한 API 라우트 래퍼
 *
 * @example
 * export const GET = withErrorHandler(async (request) => {
 *   // ... your logic
 *   return NextResponse.json({ data });
 * }, 'GET /api/members');
 */
export function withErrorHandler<T>(
  handler: (request: Request) => Promise<NextResponse<T>>,
  context?: string
) {
  return async (request: Request): Promise<NextResponse<T | ApiErrorResponse>> => {
    try {
      return await handler(request);
    } catch (error) {
      return handleApiError(error, context) as NextResponse<ApiErrorResponse>;
    }
  };
}
