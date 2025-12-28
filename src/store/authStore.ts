/**
 * Zustand Auth Store
 *
 * 전역 인증 상태 관리
 * - Supabase Auth와 통합
 * - localStorage persist (user, profile)
 * - DevTools 통합 (개발 환경)
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// UserProfile 타입 정의
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string | null;
}

// Auth Store 상태 인터페이스
interface AuthState {
  // 상태
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}

// Auth Store 액션 인터페이스
interface AuthActions {
  // 인증 메서드
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  fetchUser: () => Promise<void>;

  // 상태 설정 메서드
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  clearError: () => void;

  // 권한 확인 메서드
  hasRole: (requiredRoles: string[]) => boolean;
  isAdmin: () => boolean;
}

// Auth Store 전체 타입
export type AuthStore = AuthState & AuthActions;

// 초기 상태
const initialState: AuthState = {
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

/**
 * Zustand Auth Store
 */
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        ...initialState,

        // 로그인
        signIn: async (email: string, password: string) => {
          const supabase = createClient();

          try {
            set({ isLoading: true, error: null }, false, 'auth/signIn/start');

            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (error) {
              set({ error, isLoading: false }, false, 'auth/signIn/error');
              return { error };
            }

            // fetchUser는 onAuthStateChange에서 자동 호출되지만,
            // UI 반응성을 위해 여기서도 상태를 업데이트합니다.
            set({
              user: data.user,
              isAuthenticated: !!data.user,
              isLoading: false
            }, false, 'auth/signIn/success');
            return { error: null };
          } catch (error) {
            const err = error as Error;
            set({ error: err, isLoading: false }, false, 'auth/signIn/catch');
            return { error: err };
          }
        },

        // 회원가입
        signUp: async (email: string, password: string, name: string) => {
          const supabase = createClient();

          try {
            set({ isLoading: true, error: null }, false, 'auth/signUp/start');

            const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  name,
                },
              },
            });

            if (error) {
              set({ error, isLoading: false }, false, 'auth/signUp/error');
              return { error };
            }

            set({ isLoading: false }, false, 'auth/signUp/success');
            return { error: null };
          } catch (error) {
            const err = error as Error;
            set({ error: err, isLoading: false }, false, 'auth/signUp/catch');
            return { error: err };
          }
        },

        // 로그아웃
        signOut: async () => {
          const supabase = createClient();

          try {
            set({ isLoading: true, error: null }, false, 'auth/signOut/start');

            // Supabase 로그아웃 시도 (최대 2초 대기)
            // 네트워크 이슈 등으로 응답이 없어도 로컬 상태는 초기화해야 함
            try {
              const signOutPromise = supabase.auth.signOut();
              const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ error: new Error('Timeout') }), 2000));

              await Promise.race([signOutPromise, timeoutPromise]);
            } catch (e) {
              console.warn('Supabase signOut ignored error:', e);
            }

            // 성공/실패/타임아웃 여부와 관계없이 로컬 상태 초기화
            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            }, false, 'auth/signOut/success');

            return { error: null };
          } catch (error) {
            const err = error as Error;
            console.error('SignOut catch error:', error);

            // 예외 발생 시에도 상태 초기화
            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            }, false, 'auth/signOut/catch');

            return { error: err };
          }
        },

        // 현재 사용자 정보 가져오기
        fetchUser: async () => {
          const supabase = createClient();

          try {
            set({ isLoading: true, error: null }, false, 'auth/fetchUser/start');

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
              throw sessionError;
            }

            if (!session?.user) {
              set({
                user: null,
                profile: null,
                isAuthenticated: false,
                isLoading: false
              }, false, 'auth/fetchUser/noSession');
              return;
            }

            // 프로필 정보 가져오기
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('프로필 로드 에러:', profileError);
            }

            set({
              user: session.user,
              profile: profile || null,
              isAuthenticated: true,
              isLoading: false
            }, false, 'auth/fetchUser/success');
          } catch (error) {
            console.error('fetchUser error:', error);
            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              isLoading: false,
              error: error as Error
            }, false, 'auth/fetchUser/catch');
          }
        },

        // 사용자 설정
        setUser: (user: User | null) => {
          set({
            user,
            isAuthenticated: !!user
          }, false, 'auth/setUser');
        },

        // 프로필 설정
        setProfile: (profile: UserProfile | null) => {
          set({ profile }, false, 'auth/setProfile');
        },

        // 로딩 상태 설정
        setLoading: (isLoading: boolean) => {
          set({ isLoading }, false, 'auth/setLoading');
        },

        // 에러 설정
        setError: (error: Error | null) => {
          set({ error }, false, 'auth/setError');
        },

        // 에러 클리어
        clearError: () => {
          set({ error: null }, false, 'auth/clearError');
        },

        // 역할 확인
        hasRole: (requiredRoles: string[]) => {
          const { profile } = get();
          if (!profile?.role) return false;
          return requiredRoles.includes(profile.role);
        },

        // ADMIN 권한 확인
        isAdmin: () => {
          const { profile } = get();
          return profile?.role === 'ADMIN';
        },
      }),
      {
        name: 'auth-storage', // localStorage key
        partialize: (state) => ({
          // localStorage에 저장할 상태만 선택
          user: state.user,
          profile: state.profile,
        }),
      }
    ),
    {
      name: 'AuthStore', // DevTools 이름
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/**
 * Store 상태 선택 헬퍼 (성능 최적화)
 */
export const selectUser = (state: AuthStore) => state.user;
export const selectProfile = (state: AuthStore) => state.profile;
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectIsLoading = (state: AuthStore) => state.isLoading;
export const selectError = (state: AuthStore) => state.error;
