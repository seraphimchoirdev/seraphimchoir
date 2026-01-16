import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';


/**
 * Next.js 미들웨어
 * 모든 요청에 대해 Supabase 세션을 업데이트하고 보호된 라우트를 처리합니다.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

/**
 * 미들웨어가 실행될 경로 설정
 * - API 라우트와 정적 파일은 제외
 */
export const config = {
  matcher: [
    /*
     * 다음으로 시작하는 경로를 제외한 모든 요청 경로에 매칭:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘 파일)
     * - public 폴더의 파일들 (필요시)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

