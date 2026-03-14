import { createServerClient } from '@supabase/ssr';

import { type NextRequest, NextResponse } from 'next/server';

/**
 * Supabase 미들웨어 클라이언트
 * Next.js 미들웨어에서 인증 상태를 확인하고 쿠키를 관리합니다.
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // API 라우트는 자체 인증을 수행하므로 middleware에서 getUser() 스킵
  // → API 호출당 ~100-300ms 절약
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  if (isApiRoute) {
    return supabaseResponse;
  }

  // OAuth 콜백은 인증 체크 없이 통과
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return supabaseResponse;
  }

  // 세션 새로고침 (만료된 토큰 갱신)
  // 중요: getUser()가 아닌 getSession()을 호출하지 마세요
  // getSession()은 클라이언트 측에서만 사용해야 합니다
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // DB reset 등으로 JWT가 가리키는 사용자가 존재하지 않는 경우
  // 쿠키를 클리어하고 로그인 페이지로 리다이렉트
  if (userError && !user) {
    // Supabase 관련 쿠키 모두 삭제
    const cookieNames = request.cookies.getAll().map((c) => c.name);
    for (const name of cookieNames) {
      if (name.startsWith('sb-')) {
        supabaseResponse.cookies.delete(name);
      }
    }

    const protectedCheck = [
      '/dashboard', '/members', '/attendances', '/arrangements',
      '/statistics', '/service-schedules', '/my-attendance',
      '/documents', '/member-link', '/admin', '/mypage',
      '/management', '/newsletters',
    ];
    if (protectedCheck.some((path) => request.nextUrl.pathname.startsWith(path))) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // 인증이 필요한 페이지 보호
  const protectedPaths = [
    '/dashboard',
    '/members',
    '/attendances',
    '/arrangements',
    '/statistics',
    '/service-schedules',
    '/my-attendance',
    '/documents',
    '/member-link',
    '/admin',
    '/mypage',
    '/management',
    '/newsletters',
  ];
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 로그인한 사용자가 로그인/회원가입 페이지 접근 시 리다이렉트
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (user && isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
