/**
 * Auth Provider
 *
 * Auth 초기화 및 상태 변경 리스너를 관리하는 Provider 컴포넌트
 * - 앱 시작 시 세션 체크
 * - Supabase Auth 상태 변경 리스너 설정
 * - Auth Store 업데이트
 */

'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const setUser = useAuthStore((state) => state.setUser);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setLoading = useAuthStore((state) => state.setLoading);

  // 중복 실행 방지
  const initialized = useRef(false);

  useEffect(() => {
    // 이미 초기화되었으면 실행하지 않음
    if (initialized.current) return;
    initialized.current = true;

    const supabase = createClient();

    // 초기 세션 체크
    const initAuth = async () => {
      console.log('[AuthProvider] 세션 체크 시작');
      await fetchUser();
      console.log('[AuthProvider] 세션 체크 완료');
    };

    initAuth();

    // Auth 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthProvider] Auth 상태 변경:', event, session ? '세션 있음' : '세션 없음');

      if (session?.user) {
        // 프로필 정보 가져오기
        // 주의: 여기서 setLoading(true)를 호출하지 않음
        // 이미 인증된 상태에서 프로필만 업데이트하는 경우이므로
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('[AuthProvider] 프로필 로드 에러:', profileError);
        } else {
          console.log('[AuthProvider] 프로필 로드 완료:', profile?.name);
        }

        setUser(session.user);
        setProfile(profile || null);
      } else {
        // 로그아웃 상태
        setUser(null);
        setProfile(null);
      }
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser, setUser, setProfile, setLoading]);

  return <>{children}</>;
}
