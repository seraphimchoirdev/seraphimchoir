import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Next.js 미들웨어
 *
 * 모든 요청에서 실행되며 다음을 처리합니다:
 * 1. Supabase 세션 갱신
 * 2. 인증이 필요한 페이지 보호
 * 3. 로그인한 사용자가 로그인/회원가입 페이지 접근 시 리다이렉트
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * 미들웨어 실행 경로 설정
 *
 * matcher를 사용하여 특정 경로에서만 미들웨어를 실행합니다.
 * - /api, /_next/static, /_next/image, /favicon.ico는 제외
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
