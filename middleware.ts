import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { generateNonce, generateFullCSPHeader, generateReportToHeader } from '@/lib/security/csp-nonce';

export async function middleware(request: NextRequest) {
  // Supabase 세션 업데이트
  const response = await updateSession(request);

  // 프로덕션 환경에서 CSP nonce 적용
  if (process.env.NODE_ENV === 'production') {
    // HTML 페이지 요청에만 CSP 적용 (API 요청 제외)
    const contentType = request.headers.get('accept') || '';
    const isPageRequest = contentType.includes('text/html');
    const isApiRequest = request.nextUrl.pathname.startsWith('/api/');

    if (isPageRequest && !isApiRequest) {
      // nonce 생성
      const nonce = generateNonce();

      // CSP 헤더 생성
      const cspHeader = generateFullCSPHeader(nonce);

      // 응답 헤더에 CSP 추가
      response.headers.set('Content-Security-Policy', cspHeader);

      // Report-To 헤더 추가 (최신 Reporting API)
      const reportToHeader = generateReportToHeader();
      if (reportToHeader) {
        response.headers.set('Report-To', reportToHeader);
      }

      // nonce를 다른 컴포넌트에서 사용할 수 있도록 헤더에 추가
      response.headers.set('x-nonce', nonce);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - public file extensions (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};