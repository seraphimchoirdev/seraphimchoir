import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { createLogger } from '../logger';
import { generateNonce } from './csp-nonce';

const logger = createLogger({ prefix: 'CSRF' });

// CSRF 토큰 생성
export async function generateCSRFToken(): Promise<string> {
  return generateNonce();
}

// CSRF 토큰 쿠키 설정
export async function setCSRFTokenCookie(response: NextResponse, token: string) {
  const cookieStore = await cookies();
  cookieStore.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

// CSRF 토큰 검증
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // GET, HEAD, OPTIONS 요청은 CSRF 검증 제외
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  try {
    const cookieStore = await cookies();
    const headerStore = await headers();

    // 쿠키에서 토큰 가져오기
    const cookieToken = cookieStore.get('csrf-token')?.value;

    // 헤더 또는 바디에서 토큰 가져오기
    const headerToken = headerStore.get('x-csrf-token');

    // 바디에서 토큰 확인 (폼 제출의 경우)
    let bodyToken: string | undefined;
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.clone().json();
        bodyToken = body._csrf;
      } catch {
        // JSON 파싱 실패는 무시
      }
    }

    const requestToken = headerToken || bodyToken;

    // 토큰이 없으면 실패
    if (!cookieToken || !requestToken) {
      logger.warn('CSRF token missing', {
        hasCookieToken: !!cookieToken,
        hasRequestToken: !!requestToken,
        method: request.method,
        url: request.url,
      });
      return false;
    }

    // 토큰 비교
    const isValid = cookieToken === requestToken;

    if (!isValid) {
      logger.warn('CSRF token mismatch', {
        method: request.method,
        url: request.url,
      });
    }

    return isValid;
  } catch (error) {
    logger.error('CSRF validation error:', error);
    return false;
  }
}

// CSRF 보호 미들웨어
export async function csrfProtection(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  // CSRF 토큰 검증
  const isValid = await validateCSRFToken(request);

  if (!isValid) {
    return NextResponse.json(
      {
        error: 'CSRF token validation failed',
        message: '보안 검증에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.',
      },
      { status: 403 }
    );
  }

  // 정상 처리
  const response = await handler();

  // 새로운 CSRF 토큰 생성 및 설정 (로테이션)
  if (request.method === 'POST' && response.status === 200) {
    const newToken = await generateCSRFToken();
    await setCSRFTokenCookie(response, newToken);
    response.headers.set('x-csrf-token', newToken);
  }

  return response;
}

// 클라이언트용 CSRF 토큰 가져오기 API
export async function getCSRFToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('csrf-token')?.value || null;
  } catch {
    return null;
  }
}
