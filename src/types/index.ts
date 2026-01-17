import { Tables, Enums } from './database.types';

// Supabase table types
export type Member = Tables<'members'>;
export type Attendance = Tables<'attendances'>;
export type Arrangement = Tables<'arrangements'>;
export type Seat = Tables<'seats'>;
export type UserProfile = Tables<'user_profiles'>;

// Enum types
export type Part = Enums<'part'>;
export type MemberStatus = Enums<'member_status'>;

// Extended types

/**
 * members_public 뷰에 해당하는 타입
 * - is_singer: 자리배치/출석체크 대상 여부 (false=지휘자,반주자)
 * - height_cm: 키 (cm)
 * - regular_member_since: 정대원 임명일
 *
 * 주의: 마이그레이션 후 `npx supabase gen types`로 재생성 필요
 */
export interface MemberPublic extends Omit<Member, 'conductor_notes_auth_tag' | 'conductor_notes_iv' | 'encrypted_conductor_notes'> {
  is_singer: boolean;
  height_cm: number | null;
  regular_member_since: string | null;
}

/**
 * members_with_attendance 뷰에 해당하는 타입
 */
export interface MemberWithLastAttendance extends MemberPublic {
  last_service_date: string | null;
  last_practice_date: string | null;
}

export interface MemberWithAttendances extends Member {
  attendances: Attendance[];
}

export interface ArrangementWithSeats extends Arrangement {
  seats: SeatWithMember[];
}

export interface SeatWithMember extends Seat {
  member: Member;
}

// Form types
export interface MemberFormData {
  name: string;
  part: Part;
  isLeader?: boolean;
  phoneNumber?: string;
  email?: string;
  notes?: string;
}

export interface AttendanceFormData {
  memberId: string;
  date: Date;
  isAvailable: boolean;
  notes?: string;
}

export interface ArrangementFormData {
  date: Date;
  title: string;
  serviceInfo?: string;
  conductor?: string;
}

// UI types
export interface SeatPosition {
  row: number;
  column: number;
}

export interface DraggableSeat extends SeatPosition {
  memberId: string;
  memberName: string;
  part: Part;
}

// Statistics
export interface PartStatistics {
  part: Part;
  count: number;
}

export interface ArrangementStatistics {
  totalMembers: number;
  partStatistics: PartStatistics[];
}
