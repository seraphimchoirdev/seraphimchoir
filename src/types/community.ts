import type { Tables } from './database.types';

// ============================================================
// Base DB types
// ============================================================
export type CommunityPost = Tables<'community_posts'>;
export type PostAttachment = Tables<'post_attachments'>;
export type PostComment = Tables<'post_comments'>;
export type PostLike = Tables<'post_likes'>;
export type NoticeConfirmation = Tables<'notice_confirmations'>;
export type PhotoAlbum = Tables<'photo_albums'>;
export type AlbumPhoto = Tables<'album_photos'>;
export type AlbumPhotoComment = Tables<'album_photo_comments'>;
export type AlbumPhotoReaction = Tables<'album_photo_reactions'>;
export type Poll = Tables<'polls'>;
export type PollOption = Tables<'poll_options'>;
export type PollResponse = Tables<'poll_responses'>;

// ============================================================
// Enum-like string literals
// ============================================================
export type PostType = 'feed' | 'notice';
export type FeedCategory = 'performance' | 'celebration' | 'sharing' | 'daily' | 'prayer';
export type NoticePriority = 'normal' | 'important' | 'urgent';
export type PollType = 'attendance' | 'choice' | 'open_ended';
export type AttendanceStatus = 'attending' | 'not_attending' | 'undecided';

// ============================================================
// Author info (user_profiles + members JOIN 결과)
// ============================================================
export interface PostAuthor {
  id: string;
  name: string;
  part: string | null;
  role: string | null;
}

// ============================================================
// 게시글 관련 Rich types
// ============================================================

/** 게시글 + author + attachments (목록/상세용) */
export interface PostWithAuthor extends CommunityPost {
  author: PostAuthor | null;
  attachments: PostAttachment[];
  is_liked_by_me?: boolean;
  is_confirmed_by_me?: boolean;
}

/** 댓글 + author + 대댓글 */
export interface CommentWithAuthor extends PostComment {
  author: PostAuthor | null;
  replies?: CommentWithAuthor[];
}

// ============================================================
// 공지 확인 현황
// ============================================================

/** 파트별 확인 현황 */
export interface PartConfirmationStatus {
  part: string;
  confirmed: Array<{
    user_id: string;
    name: string;
    confirmed_at: string;
  }>;
  unconfirmed: Array<{
    user_id: string;
    name: string;
  }>;
  total: number;
  confirmed_count: number;
}

// ============================================================
// 페이지네이션
// ============================================================

/** 커서 기반 페이지네이션 응답 */
export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ============================================================
// 앨범 관련 Rich types
// ============================================================

export interface AlbumCreator {
  id: string;
  name: string;
  role: string | null;
}

/** 앨범 + 작성자 + 커버 (목록/상세용) */
export interface AlbumWithMeta extends PhotoAlbum {
  creator: AlbumCreator | null;
  cover_url: string | null;
  event?: { id: string; title: string; event_date: string } | null;
}

/** 이모지별 반응 집계 (예: { '❤️': 3, '😂': 1 }) */
export type PhotoReactionCounts = Record<string, number>;

/** 앨범 사진 + 업로더 + 상호작용(반응/댓글) 정보 */
export interface AlbumPhotoWithUploader extends AlbumPhoto {
  uploader: AlbumCreator | null;
  /** 현재 사용자가 남긴 반응 이모지 (없으면 null) */
  my_reaction: string | null;
  /** 이모지별 반응 수 집계 */
  reaction_counts: PhotoReactionCounts;
  /** 댓글 수 (album_photos.comment_count 캐시) */
  comment_count: number;
}

/** 사진 댓글 + author + 대댓글 (CommentWithAuthor 패턴 복제) */
export interface PhotoCommentWithAuthor extends AlbumPhotoComment {
  author: PostAuthor | null;
  replies?: PhotoCommentWithAuthor[];
}

/** 반응 토글 응답 */
export interface TogglePhotoReactionResponse {
  my_reaction: string | null;
  reaction_counts: PhotoReactionCounts;
}

export interface CreateAlbumRequest {
  title: string;
  description?: string;
  event_date: string;
  cover_image_path?: string;
  choir_event_id?: string;
}

export interface UpdateAlbumRequest {
  title?: string;
  description?: string;
  event_date?: string;
  cover_image_path?: string;
  choir_event_id?: string | null;
}

export interface UploadAlbumPhotosRequest {
  photos: Array<{
    file_path: string;
    thumbnail_path?: string;
    caption?: string;
    file_size?: number;
  }>;
}

/** 공지 목록 응답 (pinned 분리) */
export interface NoticeListResponse {
  pinned: PostWithAuthor[];
  data: PostWithAuthor[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ============================================================
// API 요청 타입
// ============================================================

export interface CreatePostRequest {
  post_type: PostType;
  title?: string;
  content: string;
  category?: FeedCategory;
  priority?: NoticePriority;
  is_pinned?: boolean;
  requires_confirmation?: boolean;
  attachments?: Array<{
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    thumbnail_path?: string;
    sort_order: number;
  }>;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  category?: FeedCategory;
  priority?: NoticePriority;
  is_pinned?: boolean;
  requires_confirmation?: boolean;
}

export interface CreateCommentRequest {
  post_id: string;
  parent_id?: string;
  content: string;
}
