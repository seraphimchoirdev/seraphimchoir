/**
 * useDocuments Hook
 *
 * 문서 아카이빙 관련 React Query 훅
 * - 문서 목록 조회 (태그/연도 필터)
 * - 문서 업로드
 * - 문서 삭제
 * - 태그 목록 조회
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { createLogger } from '@/lib/logger';
import { STALE_TIME } from '@/lib/constants';

const logger = createLogger({ prefix: 'useDocuments' });

export interface Document {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  tags: string[];
  year: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentFilters {
  tags?: string[];
  year?: number;
  search?: string;
}

interface UploadDocumentParams {
  file: File;
  title: string;
  description?: string;
  tags?: string[];
  year?: number;
}

// 문서 목록 조회
export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      // 연도 필터
      if (filters?.year) {
        query = query.eq('year', filters.year);
      }

      // 태그 필터 (하나라도 포함)
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // 검색 (제목, 설명)
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as Document[];
    },
  });
}

// 단일 문서 조회
export function useDocument(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data as Document;
    },
    enabled: !!id,
  });
}

// 모든 태그 조회 (자동완성용)
export function useDocumentTags() {
  return useQuery({
    queryKey: ['document-tags'],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('get_all_document_tags');

      if (error) throw error;

      return (data || []) as string[];
    },
  });
}

// 문서 업로드
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, title, description, tags, year }: UploadDocumentParams) => {
      const supabase = createClient();

      // 1. Storage에 파일 업로드
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${year || new Date().getFullYear()}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. documents 테이블에 메타데이터 저장
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title,
          description: description || null,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          tags: tags || [],
          year: year || new Date().getFullYear(),
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        // 메타데이터 저장 실패 시 업로드된 파일 삭제
        await supabase.storage.from('documents').remove([filePath]);
        throw error;
      }

      return data as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-tags'] });
    },
  });
}

// 문서 수정
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      description,
      tags,
    }: {
      id: string;
      title?: string;
      description?: string;
      tags?: string[];
    }) => {
      const supabase = createClient();

      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (tags !== undefined) updates.tags = tags;

      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as Document;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', data.id] });
      queryClient.invalidateQueries({ queryKey: ['document-tags'] });
    },
  });
}

// 문서 삭제
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();

      // 1. 문서 정보 조회
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Storage에서 파일 삭제
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);

      if (storageError) {
        logger.error('Storage 삭제 실패:', storageError);
        // Storage 삭제 실패해도 DB에서는 삭제 진행
      }

      // 3. documents 테이블에서 삭제
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-tags'] });
    },
  });
}

// 문서 다운로드 URL 생성
export function useDocumentDownloadUrl(filePath: string) {
  return useQuery({
    queryKey: ['document-download-url', filePath],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60 * 60); // 1시간 유효

      if (error) throw error;

      return data.signedUrl;
    },
    enabled: !!filePath,
    staleTime: STALE_TIME.DOCUMENTS, // 30분
  });
}

// 파일 크기 포맷
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
