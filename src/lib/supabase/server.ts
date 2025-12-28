import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
} from '@/lib/env-validation';

/**
 * Supabase 서버 클라이언트 (Server Components 및 API Routes용)
 * 서버에서만 실행되며, 쿠키를 읽고 쓸 수 있습니다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 setAll이 호출된 경우 무시
            // Middleware에서만 쿠키를 설정할 수 있습니다
          }
        },
      },
    }
  );
}

/**
 * Supabase Admin 클라이언트 (서버 전용, 모든 권한)
 * Service Role Key를 사용하여 RLS를 우회합니다.
 * 주의: 클라이언트에 노출하지 마세요!
 */
export function createAdminClient() {
  return createServerClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Admin client doesn't need to set cookies
        },
      },
    }
  );
}
