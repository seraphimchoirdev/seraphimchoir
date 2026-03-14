import { ApiError, handleApiError, type ApiErrorCode } from '../api-error-handler';

// NextResponse 모킹
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

describe('api-error-handler', () => {
  describe('ApiError 클래스', () => {
    it('기본 생성자가 올바르게 동작한다', () => {
      const error = new ApiError(400, '잘못된 요청', 'BAD_REQUEST');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('잘못된 요청');
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.name).toBe('ApiError');
      expect(error).toBeInstanceOf(Error);
    });

    it('details를 포함할 수 있다', () => {
      const details = { field: 'email', reason: 'invalid' };
      const error = new ApiError(400, '검증 실패', 'VALIDATION_ERROR', details);
      expect(error.details).toEqual(details);
    });

    describe('정적 팩토리 메서드', () => {
      it('unauthorized()는 401 에러를 생성한다', () => {
        const error = ApiError.unauthorized();
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('UNAUTHORIZED');
      });

      it('forbidden()은 403 에러를 생성한다', () => {
        const error = ApiError.forbidden();
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('FORBIDDEN');
      });

      it('notFound()는 404 에러를 생성한다', () => {
        const error = ApiError.notFound('배치표');
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toContain('배치표');
      });

      it('notFound() 기본값이 리소스이다', () => {
        const error = ApiError.notFound();
        expect(error.message).toContain('리소스');
      });

      it('badRequest()는 400 에러를 생성한다', () => {
        const error = ApiError.badRequest('잘못된 입력');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('BAD_REQUEST');
      });

      it('validation()은 400 VALIDATION_ERROR를 생성한다', () => {
        const error = ApiError.validation('검증 실패', { fields: ['name'] });
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details).toEqual({ fields: ['name'] });
      });

      it('versionConflict()는 409 에러를 생성한다', () => {
        const error = ApiError.versionConflict();
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('VERSION_CONFLICT');
      });

      it('duplicate()는 409 에러를 생성한다', () => {
        const error = ApiError.duplicate();
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('DUPLICATE_ENTRY');
      });

      it('internal()은 500 에러를 생성한다', () => {
        const error = ApiError.internal();
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('INTERNAL_ERROR');
      });
    });
  });

  describe('handleApiError', () => {
    it('ApiError를 적절한 응답으로 변환한다', () => {
      const error = ApiError.notFound('배치표');
      const response = handleApiError(error, 'GET /api/arrangements');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: expect.stringContaining('배치표'),
        code: 'NOT_FOUND',
      });
    });

    it('ApiError의 details를 응답에 포함한다', () => {
      const error = ApiError.badRequest('검증 실패', { field: 'name' });
      const response = handleApiError(error);

      expect(response.body).toHaveProperty('details');
      expect((response.body as { details: unknown }).details).toEqual({ field: 'name' });
    });

    it('ZodError를 400 VALIDATION_ERROR로 변환한다', () => {
      // ZodError 모의 (실제 Zod 사용 없이 구조만 흉내)
      const { ZodError } = jest.requireActual('zod');
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
      ]);

      const response = handleApiError(zodError);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('일반 Error를 500으로 변환한다', () => {
      const error = new Error('예기치 못한 에러');
      const response = handleApiError(error);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('code', 'INTERNAL_ERROR');
    });

    it('알 수 없는 에러를 500으로 변환한다', () => {
      const response = handleApiError('문자열 에러');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('code', 'INTERNAL_ERROR');
    });

    it('context를 로그에 사용한다 (에러 없이 동작)', () => {
      const error = ApiError.internal();
      expect(() => handleApiError(error, 'POST /api/members')).not.toThrow();
    });
  });
});
