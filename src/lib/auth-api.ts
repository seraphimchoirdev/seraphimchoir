/**
 * 클라이언트 측 인증 API 헬퍼 함수
 *
 * 이 파일은 브라우저에서 인증 API를 호출하는 편의 함수를 제공합니다.
 * Next.js API Routes를 통해 Supabase Auth와 통신합니다.
 */
import type {
  ErrorResponse,
  GetCurrentUserResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  SignupRequest,
  SignupResponse,
  UpdateRoleRequest,
  UpdateRoleResponse,
} from '@/app/api/auth/types';

import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'AuthApi' });

/**
 * API 응답 타입
 */
type ApiResponse<T> = {
  data: T | null;
  error: string | null;
};

/**
 * API 요청 헬퍼
 */
async function apiRequest<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: (data as ErrorResponse).error || '요청 처리 중 오류가 발생했습니다.',
      };
    }

    return {
      data: data as T,
      error: null,
    };
  } catch (error) {
    logger.error('API request error:', error);
    return {
      data: null,
      error: '네트워크 오류가 발생했습니다.',
    };
  }
}

/**
 * 회원가입
 */
export async function signupWithApi(
  email: string,
  password: string,
  name: string
): Promise<ApiResponse<SignupResponse>> {
  return apiRequest<SignupResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name } as SignupRequest),
  });
}

/**
 * 로그인
 */
export async function loginWithApi(
  email: string,
  password: string
): Promise<ApiResponse<LoginResponse>> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password } as LoginRequest),
  });
}

/**
 * 로그아웃
 */
export async function logoutWithApi(): Promise<ApiResponse<LogoutResponse>> {
  return apiRequest<LogoutResponse>('/api/auth/logout', {
    method: 'POST',
  });
}

/**
 * 현재 사용자 조회
 */
export async function getCurrentUserWithApi(): Promise<ApiResponse<GetCurrentUserResponse>> {
  return apiRequest<GetCurrentUserResponse>('/api/auth/me', {
    method: 'GET',
  });
}

/**
 * 사용자 역할 변경 (ADMIN 권한 필요)
 */
export async function updateUserRoleWithApi(
  userId: string,
  role: 'ADMIN' | 'CONDUCTOR' | 'MANAGER' | 'PART_LEADER'
): Promise<ApiResponse<UpdateRoleResponse>> {
  return apiRequest<UpdateRoleResponse>('/api/auth/roles', {
    method: 'PATCH',
    body: JSON.stringify({ userId, role } as UpdateRoleRequest),
  });
}

/**
 * 사용 예시:
 *
 * // 회원가입
 * const { data, error } = await signupWithApi('user@example.com', 'password123', '홍길동');
 * if (error) {
 *   console.error(error);
 * } else {
 *   console.log('회원가입 성공:', data);
 * }
 *
 * // 로그인
 * const { data, error } = await loginWithApi('user@example.com', 'password123');
 *
 * // 현재 사용자 조회
 * const { data, error } = await getCurrentUserWithApi();
 *
 * // 로그아웃
 * const { data, error } = await logoutWithApi();
 *
 * // 역할 변경 (ADMIN만 가능)
 * const { data, error } = await updateUserRoleWithApi('user-id', 'CONDUCTOR');
 */
