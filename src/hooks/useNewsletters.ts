import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants';

import type { Database } from '@/types/database.types';

type Newsletter = Database['public']['Tables']['newsletters']['Row'];
type NewsletterInsert = Database['public']['Tables']['newsletters']['Insert'];
type NewsletterUpdate = Database['public']['Tables']['newsletters']['Update'];

export interface NewsletterFilters {
  status?: 'DRAFT' | 'PUBLISHED';
  year?: number;
}

interface NewslettersResponse {
  data: Newsletter[];
  meta: { total: number | null };
}

interface LatestNewsletterMeta {
  data: {
    volume: number;
    issue_number: number;
    serial_number: number;
    year_motto: string | null;
    publisher_name: string | null;
    editor_name: string | null;
    editor_weekly_name: string | null;
    fixed_footer_text: string | null;
    issue_date: string;
  } | null;
}

/**
 * 소식지 목록 조회
 */
export function useNewsletters(filters?: NewsletterFilters) {
  return useQuery({
    queryKey: ['newsletters', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.year) params.append('year', filters.year.toString());

      const response = await fetch(`/api/newsletters?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '소식지 목록을 불러오는데 실패했습니다');
      }

      return response.json() as Promise<NewslettersResponse>;
    },
    staleTime: STALE_TIME.LONG,
  });
}

/**
 * 소식지 단일 조회
 */
export function useNewsletter(id: string | undefined) {
  return useQuery({
    queryKey: ['newsletters', id],
    queryFn: async () => {
      if (!id) throw new Error('ID가 필요합니다');

      const response = await fetch(`/api/newsletters/${id}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '소식지를 불러오는데 실패했습니다');
      }

      return response.json() as Promise<Newsletter>;
    },
    enabled: !!id,
    staleTime: STALE_TIME.LONG,
  });
}

/**
 * 최근 소식지 메타정보 (자동 채움용)
 */
export function useLatestNewsletterMeta() {
  return useQuery({
    queryKey: ['newsletters', 'latest-meta'],
    queryFn: async () => {
      const response = await fetch('/api/newsletters/latest');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '최근 소식지 정보를 불러오는데 실패했습니다');
      }

      return response.json() as Promise<LatestNewsletterMeta>;
    },
    staleTime: STALE_TIME.EXTRA_LONG,
  });
}

/**
 * 소식지 생성
 */
export function useCreateNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewsletterInsert) => {
      const response = await fetch('/api/newsletters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '소식지 생성에 실패했습니다');
      }

      return response.json() as Promise<Newsletter>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    },
  });
}

/**
 * 소식지 수정
 */
export function useUpdateNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: NewsletterUpdate }) => {
      const response = await fetch(`/api/newsletters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '소식지 수정에 실패했습니다');
      }

      return response.json() as Promise<Newsletter>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['newsletters', variables.id] });
    },
  });
}

/**
 * 소식지 삭제
 */
export function useDeleteNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsletters/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '소식지 삭제에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    },
  });
}

/**
 * 소식지 발행
 */
export function usePublishNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsletters/${id}/publish`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '소식지 발행에 실패했습니다');
      }

      return response.json() as Promise<Newsletter>;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['newsletters', id] });
    },
  });
}
