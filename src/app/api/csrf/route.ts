import { NextRequest, NextResponse } from 'next/server';

import {
  generateCSRFToken,
  getCSRFToken,
  setCSRFTokenCookie,
} from '@/lib/security/csrf-protection';

/**
 * GET /api/csrf
 * CSRF 토큰을 반환합니다.
 * 클라이언트는 이 토큰을 헤더에 포함해서 요청해야 합니다.
 */
export async function GET(_request: NextRequest) {
  try {
    // 기존 토큰 확인
    let token = await getCSRFToken();

    // 토큰이 없으면 새로 생성
    if (!token) {
      token = await generateCSRFToken();
      const response = NextResponse.json({ token });
      await setCSRFTokenCookie(response, token);
      return response;
    }

    // 기존 토큰 반환
    return NextResponse.json({ token });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 });
  }
}
