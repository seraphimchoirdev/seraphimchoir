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
