/**
 * 자동 생성된 월별 앨범을 식별하기 위한 sentinel.
 * `photo_albums.description`에 이 값이 들어 있으면 시스템 자동 앨범으로 간주.
 *
 * 사용자가 앨범을 수정해 description을 바꾸면 자연스럽게 일반 앨범으로 전환된다.
 */
export const AUTO_ALBUM_SENTINEL = '__auto_monthly__';

export function isAutoAlbum(description: string | null | undefined): boolean {
  return description === AUTO_ALBUM_SENTINEL;
}

/**
 * 앨범 생성 권한을 가진 운영진 역할.
 * 일반 대원(MEMBER)은 앨범 생성 불가, 사진 업로드만 가능.
 */
export const ALBUM_STAFF_ROLES = [
  'ADMIN',
  'CONDUCTOR',
  'MANAGER',
  'SECRETARY',
  'TREASURER',
  'PART_LEADER',
];

/**
 * 커뮤니티 활동 권한 판정.
 * - 연결된 대원(linked_member)이 있으면 승인된 대원 → 허용
 * - 또는 운영진 역할이면(linked_member가 없어도, 예: 시스템 관리자) → 허용
 */
export function canParticipateInCommunity(profile: {
  linked_member_id?: string | null;
  role?: string | null;
}): boolean {
  if (profile.linked_member_id) return true;
  return ALBUM_STAFF_ROLES.includes(profile.role || '');
}
