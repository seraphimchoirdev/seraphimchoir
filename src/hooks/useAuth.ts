/**
 * useAuth Hook
 *
 * Zustand Auth Store를 사용하는 편의 훅
 * - 기존 useAuth 인터페이스 유지 (호환성)
 * - Router, Query Client 통합
 */

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string | null;
}

export interface UseAuthReturn {
  // 상태
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;

  // 메서드
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ data: unknown; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  hasRole: (requiredRoles: string[]) => boolean;
}

/**
 * Auth Hook
 *
 * 사용 예시:
 * ```tsx
 * const { user, profile, isLoading, signIn, signOut } = useAuth();
 *
 * if (isLoading) return <div>로딩 중...</div>;
 * if (!user) return <LoginForm />;
 *
 * return <div>환영합니다, {profile?.name}님</div>;
 * ```
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Zustand Store에서 상태 가져오기
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Store 액션 가져오기
  const signInAction = useAuthStore((state) => state.signIn);
  const signUpAction = useAuthStore((state) => state.signUp);
  const signOutAction = useAuthStore((state) => state.signOut);
  const hasRole = useAuthStore((state) => state.hasRole);

  /**
   * 로그인
   */
  const signIn = async (email: string, password: string) => {
    const { error } = await signInAction(email, password);
    return { data: error ? null : {}, error };
  };

  /**
   * 회원가입
   */
  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await signUpAction(email, password, name);
    return { data: error ? null : {}, error };
  };

  /**
   * 로그아웃
   * - Supabase 로그아웃
   * - React Query 캐시 클리어
   * - 로그인 페이지로 리다이렉트
   */
  const signOut = async () => {
    const { error } = await signOutAction();

    if (!error) {
      // React Query 캐시 클리어
      queryClient.clear();

      // 로그인 페이지로 리다이렉트
      router.push('/login');
    }

    return { error };
  };

  return {
    // 상태
    user,
    profile,
    isLoading,
    error,
    isAuthenticated,

    // 메서드
    signIn,
    signUp,
    signOut,
    hasRole,
  };
}

/**
 * 특정 상태만 구독하는 최적화된 훅들
 */
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthProfile = () => useAuthStore((state) => state.profile);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthStatus = () => useAuthStore((state) => state.isAuthenticated);

/**
 * 역할 확인 훅
 */
export const useHasRole = (requiredRoles: string[]) => {
  return useAuthStore((state) => state.hasRole(requiredRoles));
};

export const useIsAdmin = () => {
  return useAuthStore((state) => state.isAdmin());
};
