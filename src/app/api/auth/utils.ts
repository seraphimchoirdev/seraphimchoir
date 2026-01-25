import { createClient } from '@/lib/supabase/server';

import type { Tables } from '@/types/database.types';

export type UserProfile = Tables<'user_profiles'>;

/**
 * 현재 인증된 사용자를 조회합니다.
 * @returns 사용자 정보 또는 null
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * 현재 인증된 사용자의 프로필을 조회합니다.
 * @returns 프로필 정보 또는 null
 */
export async function getCurrentUserProfile() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile;
}

/**
 * 현재 사용자가 특정 역할을 가지고 있는지 확인합니다.
 * @param requiredRoles 필요한 역할 배열
 * @returns 권한 여부
 */
export async function hasRole(requiredRoles: string[]): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.role) {
    return false;
  }

  return requiredRoles.includes(profile.role);
}

/**
 * ADMIN 권한을 확인합니다.
 * @returns ADMIN 권한 여부
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole(['ADMIN']);
}

/**
 * 이메일 형식을 검증합니다.
 * @param email 이메일 주소
 * @returns 유효성 여부
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 비밀번호 강도를 검증합니다.
 * @param password 비밀번호
 * @returns 유효성 여부와 에러 메시지
 */
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (password.length < 6) {
    return {
      isValid: false,
      error: '비밀번호는 최소 6자 이상이어야 합니다.',
    };
  }

  if (password.length > 72) {
    return {
      isValid: false,
      error: '비밀번호는 최대 72자까지 가능합니다.',
    };
  }

  return { isValid: true };
}

/**
 * 역할이 유효한지 확인합니다.
 * @param role 역할
 * @returns 유효성 여부
 */
export function isValidRole(role: string): boolean {
  const validRoles = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER'];
  return validRoles.includes(role);
}

/**
 * API 에러 응답을 생성합니다.
 * @param message 에러 메시지
 * @param status HTTP 상태 코드
 * @returns Response 객체
 */
export function createErrorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * API 성공 응답을 생성합니다.
 * @param data 응답 데이터
 * @param status HTTP 상태 코드
 * @returns Response 객체
 */
export function createSuccessResponse(data: unknown, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
