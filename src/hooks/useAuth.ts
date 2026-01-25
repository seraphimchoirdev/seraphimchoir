/**
 * useAuth Hook
 *
 * Zustand Auth Store를 사용하는 편의 훅
 * - 기존 useAuth 인터페이스 유지 (호환성)
 * - Router, Query Client 통합
 */
import { type RolePermissionSet, RolePermissions, type UserRole } from '@/app/api/auth/types';
import type { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/store/authStore';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string | null;
  // 대원 연결 정보
  linked_member_id: string | null;
  link_status: 'pending' | 'approved' | 'rejected' | null;
  // 연결된 대원 정보
  linked_member?: {
    name: string;
  } | null;
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
  signInWithKakao: () => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ data: unknown; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  hasRole: (requiredRoles: string[]) => boolean;
  isMemberLinked: () => boolean;
  isLinkPending: () => boolean;
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
  const signInWithKakaoAction = useAuthStore((state) => state.signInWithKakao);
  const signUpAction = useAuthStore((state) => state.signUp);
  const signOutAction = useAuthStore((state) => state.signOut);
  const hasRole = useAuthStore((state) => state.hasRole);
  const isMemberLinked = useAuthStore((state) => state.isMemberLinked);
  const isLinkPending = useAuthStore((state) => state.isLinkPending);

  /**
   * 로그인
   */
  const signIn = async (email: string, password: string) => {
    const { error } = await signInAction(email, password);
    return { data: error ? null : {}, error };
  };

  /**
   * 카카오 로그인
   * - OAuth 리다이렉트 방식
   * - 로그인 후 /auth/callback으로 이동
   */
  const signInWithKakao = async () => {
    return await signInWithKakaoAction();
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
    signInWithKakao,
    signUp,
    signOut,
    hasRole,
    isMemberLinked,
    isLinkPending,
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

/**
 * 특정 권한 확인 훅
 *
 * RolePermissions 매트릭스를 사용하여 현재 사용자의 특정 권한을 확인합니다.
 *
 * @example
 * ```tsx
 * const canEditArrangements = usePermission('canEditArrangements');
 * const canManageMembers = usePermission('canManageMembers');
 *
 * if (!canEditArrangements) return <Alert>편집 권한이 없습니다.</Alert>;
 * ```
 */
export const usePermission = (permission: keyof RolePermissionSet): boolean => {
  const profile = useAuthStore((state) => state.profile);

  if (!profile?.role) return false;

  const rolePermissions = RolePermissions[profile.role as UserRole];
  if (!rolePermissions) return false;

  return rolePermissions[permission] ?? false;
};

/**
 * 현재 사용자의 모든 권한 객체 반환
 *
 * @example
 * ```tsx
 * const permissions = useAllPermissions();
 * if (permissions?.canManageDocuments) { ... }
 * ```
 */
export const useAllPermissions = (): RolePermissionSet | null => {
  const profile = useAuthStore((state) => state.profile);

  if (!profile?.role) return null;

  return RolePermissions[profile.role as UserRole] ?? null;
};
