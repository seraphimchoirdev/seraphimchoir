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
  height?: number;
  experience?: number;
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
