import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase 클라이언트 (클라이언트 컴포넌트용)
 * 브라우저에서만 실행되며, 쿠키 기반 인증을 사용합니다.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다. ' +
      '.env 파일을 확인하세요.'
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다. ' +
      '.env 파일을 확인하세요.'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,    // 토큰 자동 갱신 (만료 전 자동으로 새 토큰 발급)
      persistSession: true,      // 세션 localStorage 저장 (브라우저 종료 후에도 유지)
      detectSessionInUrl: true,  // URL에서 세션 감지 (OAuth 콜백 처리용)
    },
  });
}
