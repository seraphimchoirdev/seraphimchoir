import type { Part } from '@/types';

/**
 * 설문 생성 권한을 가진 역할.
 * - 상위 운영진: 모든 대상(전체/임원/파트) 설문 생성 가능
 * - 파트장: 자기 파트 대상 설문만 생성 가능 (RLS에서도 동일하게 강제)
 */
export const POLL_SENIOR_STAFF_ROLES = [
  'ADMIN',
  'CONDUCTOR',
  'MANAGER',
  'SECRETARY',
  'TREASURER',
];

export const POLL_CREATOR_ROLES = [...POLL_SENIOR_STAFF_ROLES, 'PART_LEADER'];

/** 설문 관리(마감/삭제) 가능한 역할 — RLS의 "creator or managers"와 일치 */
export const POLL_MANAGER_ROLES = ['ADMIN', 'CONDUCTOR', 'MANAGER'];

/** STAFF 대상 설문의 대상 역할 — is_in_poll_audience()의 STAFF 분기와 일치 */
export const POLL_STAFF_AUDIENCE_ROLES = [...POLL_SENIOR_STAFF_ROLES, 'PART_LEADER'];

export const POLL_TYPE_LABELS: Record<string, string> = {
  attendance: '참석 조사',
  choice: '선택 투표',
  open_ended: '주관식',
};

export const POLL_AUDIENCE_LABELS: Record<string, string> = {
  ALL: '전 대원',
  STAFF: '임원',
  PART: '파트',
};

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  attending: '참석',
  not_attending: '불참',
  undecided: '미정',
};

export const PART_LABELS: Record<string, string> = {
  SOPRANO: '소프라노',
  ALTO: '알토',
  TENOR: '테너',
  BASS: '베이스',
  SPECIAL: '특별',
};

/** 설문 대상 선택 UI에 노출할 파트 목록 */
export const SELECTABLE_PARTS: Part[] = [
  'SOPRANO',
  'ALTO',
  'TENOR',
  'BASS',
  'SPECIAL',
];

/** 대상 파트 목록을 표시용 문자열로 변환 (예: "소프라노 · 알토") */
export function formatTargetParts(parts: string[] | null | undefined): string {
  if (!parts || parts.length === 0) return '';
  return parts.map((p) => PART_LABELS[p] || p).join(' · ');
}
