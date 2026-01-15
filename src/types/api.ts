/**
 * API 공통 타입 정의
 */

// 페이지네이션 메타데이터
export interface PaginationMeta {
  total: number; // 전체 항목 수
  page: number; // 현재 페이지 (1-based)
  limit: number; // 페이지당 항목 수
  totalPages: number; // 전체 페이지 수
  hasNext: boolean; // 다음 페이지 존재 여부
  hasPrev: boolean; // 이전 페이지 존재 여부
}

// 페이지네이션 응답
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// 일반 API 응답
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// 정렬 옵션
export type SortByField = 'name' | 'part' | 'experience' | 'createdAt' | 'lastServiceDate' | 'lastPracticeDate';
export type SortOrder = 'asc' | 'desc';
