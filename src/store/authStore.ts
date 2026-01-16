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
import { AUTH_CONFIG } from '@/lib/constants';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'AuthStore' });

/**
 * Supabase Auth 에러 메시지를 한글로 변환
 */
function translateAuthError(error: Error): Error {
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'Email not confirmed': '이메일 인증이 완료되지 않았습니다.',
    'User not found': '사용자를 찾을 수 없습니다.',
    'Invalid email or password': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'Email rate limit exceeded': '잠시 후 다시 시도해주세요.',
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
    'User already registered': '이미 등록된 이메일입니다.',
    'Signup requires a valid password': '유효한 비밀번호를 입력해주세요.',
    'Unable to validate email address: invalid format': '유효한 이메일 형식이 아닙니다.',
  };

  const translatedMessage = Object.entries(errorMessages).find(([key]) =>
    error.message.includes(key)
  );

  if (translatedMessage) {
    const newError = new Error(translatedMessage[1]);
    newError.name = error.name;
    return newError;
  }

  return error;
}

// UserProfile 타입 정의 (대원 연결 정보 포함)
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string | null;
  // 대원 연결 정보
  linked_member_id: string | null;
  link_status: 'pending' | 'approved' | 'rejected' | null;
}

// Auth Store 상태 인터페이스
interface AuthState {
  // 상태
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  hasHydrated: boolean; // localStorage에서 hydration 완료 여부
}

// Auth Store 액션 인터페이스
interface AuthActions {
  // 인증 메서드
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithKakao: () => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  fetchUser: () => Promise<void>;

  // 상태 설정 메서드
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  clearError: () => void;

  // Hydration 상태
  setHasHydrated: (hasHydrated: boolean) => void;

  // 권한 확인 메서드
  hasRole: (requiredRoles: string[]) => boolean;
  isAdmin: () => boolean;

  // 대원 연결 확인 메서드
  isMemberLinked: () => boolean;
  isLinkPending: () => boolean;
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
  hasHydrated: false,
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
              const translatedError = translateAuthError(error);
              set({ error: translatedError, isLoading: false }, false, 'auth/signIn/error');
              return { error: translatedError };
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
            const err = translateAuthError(error as Error);
            set({ error: err, isLoading: false }, false, 'auth/signIn/catch');
            return { error: err };
          }
        },

        // 카카오 로그인
        signInWithKakao: async () => {
          const supabase = createClient();

          try {
            set({ isLoading: true, error: null }, false, 'auth/signInWithKakao/start');

            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'kakao',
              options: {
                redirectTo: `${window.location.origin}/auth/callback`,
              },
            });

            if (error) {
              set({ error, isLoading: false }, false, 'auth/signInWithKakao/error');
              return { error };
            }

            // OAuth는 리다이렉트되므로 여기서 상태 변경하지 않음
            return { error: null };
          } catch (error) {
            const err = error as Error;
            set({ error: err, isLoading: false }, false, 'auth/signInWithKakao/catch');
            return { error: err };
          }
        },

        // 회원가입
        signUp: async (email: string, password: string, name: string) => {
          const supabase = createClient();

          try {
            set({ isLoading: true, error: null }, false, 'auth/signUp/start');

            const { error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  name,
                },
              },
            });

            if (error) {
              const translatedError = translateAuthError(error);
              set({ error: translatedError, isLoading: false }, false, 'auth/signUp/error');
              return { error: translatedError };
            }

            set({ isLoading: false }, false, 'auth/signUp/success');
            return { error: null };
          } catch (error) {
            const err = translateAuthError(error as Error);
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
              const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ error: new Error('Timeout') }), AUTH_CONFIG.SIGN_OUT_TIMEOUT));

              await Promise.race([signOutPromise, timeoutPromise]);
            } catch (e) {
              logger.warn('Supabase signOut ignored error:', e);
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
            logger.error('SignOut catch error:', error);

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
          logger.debug('[fetchUser] 시작');

          try {
            set({ isLoading: true, error: null }, false, 'auth/fetchUser/start');

            logger.debug('[fetchUser] getSession 호출');
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            logger.debug('[fetchUser] getSession 완료:', { hasSession: !!session, sessionError });

            if (sessionError) {
              throw sessionError;
            }

            if (!session?.user) {
              logger.debug('[fetchUser] 세션 없음');
              set({
                user: null,
                profile: null,
                isAuthenticated: false,
                isLoading: false
              }, false, 'auth/fetchUser/noSession');
              return;
            }

            // 프로필 정보 가져오기 (대원 연결 정보 포함)
            logger.debug('[fetchUser] 프로필 조회 시작:', session.user.id);
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('id, email, name, role, linked_member_id, link_status')
              .eq('id', session.user.id)
              .single();
            logger.debug('[fetchUser] 프로필 조회 완료:', { profile, profileError });

            if (profileError) {
              logger.error('[fetchUser] 프로필 로드 에러:', profileError);
            }

            set({
              user: session.user,
              profile: profile || null,
              isAuthenticated: true,
              isLoading: false
            }, false, 'auth/fetchUser/success');
            logger.debug('[fetchUser] 완료');
          } catch (error) {
            logger.error('[fetchUser] 예외:', error);
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

        // Hydration 상태 설정
        setHasHydrated: (hasHydrated: boolean) => {
          set({ hasHydrated }, false, 'auth/setHasHydrated');
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

        // 대원 연결 확인
        isMemberLinked: () => {
          const { profile } = get();
          return profile?.linked_member_id !== null && profile?.link_status === 'approved';
        },

        // 연결 대기 중 확인
        isLinkPending: () => {
          const { profile } = get();
          return profile?.link_status === 'pending';
        },
      }),
      {
        name: 'auth-storage', // localStorage key
        partialize: (state) => ({
          // localStorage에 저장할 상태만 선택
          user: state.user,
          profile: state.profile,
          isAuthenticated: state.isAuthenticated,
        }),
        // Hydration 완료 시 콜백
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Hydration 완료 후 로딩 상태 해제
            state.setLoading(false);
            state.setHasHydrated(true);
          }
        },
        // Hydration 시 상태 병합 로직
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<AuthState>;
          // user가 있으면 isAuthenticated도 true로 설정
          const isAuthenticated = !!persisted?.user;
          return {
            ...currentState,
            ...persisted,
            isAuthenticated,
            hasHydrated: true,
            isLoading: false, // Hydration 완료 시 로딩도 false로
          };
        },
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
