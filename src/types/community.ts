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
export type PollAudience = 'ALL' | 'STAFF' | 'PART';

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

// ============================================================
// 설문/투표 관련 Rich types
// ============================================================

/** 응답자 정보 (익명 설문에서는 API가 내려주지 않음) */
export interface PollVoter {
  user_id: string;
  name: string;
  part: string | null;
}

/** 선택지 + 실시간 집계 (vote_count는 GROUP BY 집계값, DB 캐시 아님) */
export interface PollOptionWithVotes extends PollOption {
  vote_count: number;
  voters: PollVoter[];
  is_my_choice: boolean;
}

/** 참석 조사 상태별 집계 */
export interface AttendanceSummary {
  status: AttendanceStatus;
  count: number;
  voters: PollVoter[];
}

/** 주관식 응답 (익명이면 author null) */
export interface PollTextResponse {
  id: string;
  text_response: string;
  created_at: string | null;
  author: PollVoter | null;
}

/** 내 응답 상태 */
export interface MyPollResponse {
  attendance_status: AttendanceStatus | null;
  selected_option_ids: string[];
  text_response: string | null;
}

/** 설문 목록 카드용 */
export interface PollWithMeta extends Poll {
  creator: PollVoter | null;
  /** 실제 응답자 수 (사람 기준, 다중 선택도 1명으로 집계) */
  voter_count: number;
  has_my_response: boolean;
  /** 마감 시각 경과 or is_closed */
  is_effectively_closed: boolean;
}

/** 설문 상세용 (목록 메타 + 결과) */
export interface PollDetail extends PollWithMeta {
  options: PollOptionWithVotes[];
  attendance_summary: AttendanceSummary[];
  text_responses: PollTextResponse[];
  my_response: MyPollResponse | null;
  can_vote: boolean;
  can_manage: boolean;
  /** 현재 사용자에게 집계 결과가 보이는지 (마감 후 공개 설문이면 false일 수 있음) */
  results_visible: boolean;
}

// ============================================================
// 설문 API 요청 타입
// ============================================================

export interface CreatePollRequest {
  title: string;
  description?: string;
  poll_type: PollType;
  audience_type: PollAudience;
  target_parts?: string[];
  options?: string[];
  is_anonymous?: boolean;
  allow_multiple?: boolean;
  deadline_at?: string | null;
  /** 마감 전 결과 공개 여부. 생략 시 참석 조사 true, 그 외 false */
  show_results_before_close?: boolean;
}

export interface UpdatePollRequest {
  title?: string;
  description?: string;
  deadline_at?: string | null;
  is_closed?: boolean;
}

export interface SubmitPollResponseRequest {
  attendance_status?: AttendanceStatus;
  option_ids?: string[];
  text_response?: string;
}
