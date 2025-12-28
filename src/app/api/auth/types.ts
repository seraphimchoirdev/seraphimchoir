import type { User, Session } from '@supabase/supabase-js';
import type { Tables } from '@/types/database.types';

/**
 * 사용자 프로필 타입
 */
export type UserProfile = Tables<'user_profiles'>;

/**
 * 사용자 역할
 */
export type UserRole = 'ADMIN' | 'CONDUCTOR' | 'MANAGER' | 'PART_LEADER';

/**
 * 회원가입 요청 바디
 */
export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * 회원가입 응답
 */
export interface SignupResponse {
  user: User | null;
  session: Session | null;
  message: string;
}

/**
 * 로그인 요청 바디
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 로그인 응답
 */
export interface LoginResponse {
  user: User;
  session: Session | null;
  profile: UserProfile | null;
  message: string;
}

/**
 * 로그아웃 응답
 */
export interface LogoutResponse {
  message: string;
}

/**
 * 현재 사용자 조회 응답
 */
export interface GetCurrentUserResponse {
  user: User;
  profile: UserProfile;
}

/**
 * 역할 변경 요청 바디
 */
export interface UpdateRoleRequest {
  userId: string;
  role: UserRole;
}

/**
 * 역할 변경 응답
 */
export interface UpdateRoleResponse {
  profile: UserProfile;
  message: string;
}

/**
 * API 에러 응답
 */
export interface ErrorResponse {
  error: string;
}

/**
 * 인증된 요청 컨텍스트
 */
export interface AuthContext {
  user: User;
  profile: UserProfile;
}

/**
 * 역할 권한 매트릭스
 */
export const RolePermissions = {
  ADMIN: [
    'manage_users',
    'manage_roles',
    'manage_members',
    'manage_arrangements',
    'view_conductor_notes',
  ],
  CONDUCTOR: [
    'manage_members',
    'manage_arrangements',
    'view_conductor_notes',
  ],
  MANAGER: [
    'manage_members',
    'view_arrangements',
  ],
  PART_LEADER: [
    'manage_part_attendance',
    'view_arrangements',
  ],
} as const;

/**
 * 권한 타입 추출
 */
type Permission = typeof RolePermissions[UserRole][number];

/**
 * 권한 체크 헬퍼
 */
export function hasPermission(role: UserRole | null, permission: string): boolean {
  if (!role) return false;

  const permissions = RolePermissions[role];
  return permissions ? (permissions as readonly string[]).includes(permission) : false;
}
