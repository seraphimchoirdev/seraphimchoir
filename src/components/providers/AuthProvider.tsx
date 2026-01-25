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

import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/client';

import { useAuthStore } from '@/store/authStore';

const logger = createLogger({ prefix: 'AuthProvider' });

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
      logger.debug('세션 체크 시작');
      await fetchUser();
      logger.debug('세션 체크 완료');
    };

    initAuth();

    // Auth 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug('Auth 상태 변경:', event, session ? '세션 있음' : '세션 없음');

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // 로그인 시 fetchUser를 호출하여 프로필 로드
        // setTimeout으로 다음 틱에서 실행하여 세션이 완전히 설정된 후 실행
        setTimeout(() => {
          fetchUser();
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        // 로그아웃 시 즉시 상태 초기화
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser, setUser, setProfile, setLoading]);

  return <>{children}</>;
}
