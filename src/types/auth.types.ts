/**
 * Auth 관련 TypeScript 타입 정의
 */
import type { User } from '@supabase/supabase-js';

/**
 * 사용자 프로필
 * user_profiles 테이블과 매핑
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * 사용자 역할
 * - ADMIN: 관리자
 * - CONDUCTOR: 지휘자
 * - ACCOMPANIST: 반주자
 * - MANAGER: 매니저
 * - PART_LEADER: 파트장
 */
export type UserRole = 'ADMIN' | 'CONDUCTOR' | 'ACCOMPANIST' | 'MANAGER' | 'PART_LEADER';

/**
 * Auth 에러
 */
export interface AuthError {
  message: string;
  status?: number;
  code?: string;
}

/**
 * Auth 응답
 */
export interface AuthResponse<T = unknown> {
  data: T | null;
  error: Error | null;
}

/**
 * 로그인 요청
 */
export interface SignInRequest {
  email: string;
  password: string;
}

/**
 * 회원가입 요청
 */
export interface SignUpRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * Auth 상태
 */
export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Auth 컨텍스트 (Hook에서 사용)
 */
export interface AuthContext extends AuthState {
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResponse>;
  signOut: () => Promise<{ error: Error | null }>;
  hasRole: (requiredRoles: string[]) => boolean;
  isAdmin: () => boolean;
}
