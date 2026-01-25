import type { User, Session } from '@supabase/supabase-js';
import type { Tables } from '@/types/database.types';

/**
 * 사용자 프로필 타입
 */
export type UserProfile = Tables<'user_profiles'>;

/**
 * 사용자 역할
 * - ADMIN: 시스템 관리자 (모든 권한)
 * - CONDUCTOR: 지휘자 (자리배치 편집, 대원 관리, 출석 관리)
 * - MANAGER: 총무/부총무 (대원 관리, 출석 관리, 문서 관리)
 * - STAFF: 대장, 서기, 회계 등 (조회 위주)
 * - PART_LEADER: 파트장 (자기 파트 출석 관리)
 * - MEMBER: 일반 대원 (내 출석, 자리배치표 조회)
 */
export type UserRole = 'ADMIN' | 'CONDUCTOR' | 'MANAGER' | 'STAFF' | 'PART_LEADER' | 'MEMBER';

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
 * 역할별 권한 상세 정의
 */
export interface RolePermissionSet {
  // 사용자/역할 관리
  canManageUsers: boolean;
  canManageRoles: boolean;
  canApproveLinks: boolean;
  canAccessAdmin: boolean;

  // 대원 관리
  canManageMembers: boolean;
  canViewMembers: boolean;

  // 출석 관리
  canManageAttendance: boolean;
  canManageOwnAttendance: boolean;
  partRestricted: boolean;  // 자기 파트만 관리 가능 여부

  // 자리배치 관리
  canCreateArrangements: boolean;
  canEditArrangements: boolean;
  canDeleteArrangements: boolean;
  canEmergencyEditArrangements: boolean;  // 공유됨 상태에서 긴급수정
  canViewArrangements: boolean;

  // 문서 관리
  canManageDocuments: boolean;
  canViewDocuments: boolean;

  // 지휘자 메모
  canViewConductorNotes: boolean;
}

/**
 * 역할별 권한 매트릭스
 */
export const RolePermissions: Record<UserRole, RolePermissionSet> = {
  ADMIN: {
    canManageUsers: true,
    canManageRoles: true,
    canApproveLinks: true,
    canAccessAdmin: true,
    canManageMembers: true,
    canViewMembers: true,
    canManageAttendance: true,
    canManageOwnAttendance: true,
    partRestricted: false,
    canCreateArrangements: true,
    canEditArrangements: true,
    canDeleteArrangements: true,
    canEmergencyEditArrangements: true,
    canViewArrangements: true,
    canManageDocuments: true,
    canViewDocuments: true,
    canViewConductorNotes: false,  // 지휘자 메모는 CONDUCTOR만 접근 가능
  },
  CONDUCTOR: {
    canManageUsers: false,
    canManageRoles: false,
    canApproveLinks: false,
    canAccessAdmin: false,
    canManageMembers: true,
    canViewMembers: true,
    canManageAttendance: true,
    canManageOwnAttendance: true,
    partRestricted: false,
    canCreateArrangements: true,
    canEditArrangements: true,
    canDeleteArrangements: true,
    canEmergencyEditArrangements: true,
    canViewArrangements: true,
    canManageDocuments: true,
    canViewDocuments: true,
    canViewConductorNotes: true,
  },
  MANAGER: {
    canManageUsers: false,
    canManageRoles: false,
    canApproveLinks: false,
    canAccessAdmin: false,
    canManageMembers: true,
    canViewMembers: true,
    canManageAttendance: true,
    canManageOwnAttendance: true,
    partRestricted: false,
    canCreateArrangements: false,
    canEditArrangements: false,
    canDeleteArrangements: false,
    canEmergencyEditArrangements: true,  // 공유됨 상태에서만 긴급수정 가능
    canViewArrangements: true,
    canManageDocuments: true,
    canViewDocuments: true,
    canViewConductorNotes: false,
  },
  STAFF: {
    canManageUsers: false,
    canManageRoles: false,
    canApproveLinks: false,
    canAccessAdmin: false,
    canManageMembers: false,
    canViewMembers: true,
    canManageAttendance: false,
    canManageOwnAttendance: true,
    partRestricted: false,
    canCreateArrangements: false,
    canEditArrangements: false,
    canDeleteArrangements: false,
    canEmergencyEditArrangements: false,
    canViewArrangements: true,
    canManageDocuments: false,
    canViewDocuments: true,
    canViewConductorNotes: false,
  },
  PART_LEADER: {
    canManageUsers: false,
    canManageRoles: false,
    canApproveLinks: false,
    canAccessAdmin: false,
    canManageMembers: true,  // 대원 등록/수정 가능 (삭제는 별도 권한 필요)
    canViewMembers: true,
    canManageAttendance: true,
    canManageOwnAttendance: true,
    partRestricted: true,  // 자기 파트만
    canCreateArrangements: false,
    canEditArrangements: false,
    canDeleteArrangements: false,
    canEmergencyEditArrangements: false,
    canViewArrangements: true,
    canManageDocuments: false,
    canViewDocuments: true,
    canViewConductorNotes: false,
  },
  MEMBER: {
    canManageUsers: false,
    canManageRoles: false,
    canApproveLinks: false,
    canAccessAdmin: false,
    canManageMembers: false,
    canViewMembers: false,  // 다른 대원 정보 조회 불가
    canManageAttendance: false,
    canManageOwnAttendance: true,  // 본인 출석만
    partRestricted: true,
    canCreateArrangements: false,
    canEditArrangements: false,
    canDeleteArrangements: false,
    canEmergencyEditArrangements: false,
    canViewArrangements: true,  // 조회만 가능
    canManageDocuments: false,
    canViewDocuments: false,
    canViewConductorNotes: false,
  },
};

/**
 * 권한 체크 헬퍼
 */
export function hasPermission(role: UserRole | null, permission: keyof RolePermissionSet): boolean {
  if (!role) return false;
  const permissions = RolePermissions[role];
  return permissions ? permissions[permission] : false;
}

/**
 * 역할 표시 이름
 */
export const RoleLabels: Record<UserRole, string> = {
  ADMIN: '관리자',
  CONDUCTOR: '지휘자',
  MANAGER: '총무',
  STAFF: '임원',
  PART_LEADER: '파트장',
  MEMBER: '대원',
};
