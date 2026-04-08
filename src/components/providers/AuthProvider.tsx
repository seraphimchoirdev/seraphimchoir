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
import { splashManager } from '@/lib/splash-manager';
import { createClient } from '@/lib/supabase/client';
import { showWarning } from '@/lib/toast';

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

    // Zustand persist에서 이미 hydration 완료된 경우 즉시 스플래시 해제
    // (Server Component 전환 후 서버에서 이미 인증된 HTML이 도착하므로)
    const { hasHydrated, isAuthenticated } = useAuthStore.getState();
    if (hasHydrated && isAuthenticated) {
      splashManager.setAppReady();
    }

    // 초기 세션 체크
    const initAuth = async () => {
      logger.debug('세션 체크 시작');
      await fetchUser();
      logger.debug('세션 체크 완료');

      // Auth 초기화 완료 → 스플래시 해제 트리거
      splashManager.setAppReady();

      // 서버 연결 실패 시 사용자에게 알림
      const error = useAuthStore.getState().error;
      if (error?.message?.includes('서버에 연결할 수 없습니다')) {
        showWarning('서버에 연결할 수 없습니다. 잠시 후 새로고침 해주세요.');
      }
    };

    initAuth();

    // Auth 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug('Auth 상태 변경:', event, session ? '세션 있음' : '세션 없음');

      if (event === 'SIGNED_IN') {
        // 로그인 시 fetchUser를 호출하여 프로필 로드
        // TOKEN_REFRESHED는 initAuth의 fetchUser와 동시 실행되어 lock 경쟁을 일으키므로 제외
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
