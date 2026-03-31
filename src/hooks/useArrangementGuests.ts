import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Database } from '@/types/database.types';

type Part = Database['public']['Enums']['part'];

export interface ArrangementGuest {
  id: string;
  arrangement_id: string;
  member_id: string;
  created_at: string;
  members: {
    id: string;
    name: string;
    part: Part;
    member_status: string;
  } | null;
}

/**
 * 특정 배치표에 연결된 게스트 멤버 목록 조회
 */
export function useArrangementGuests(arrangementId?: string) {
  return useQuery({
    queryKey: ['arrangement-guests', arrangementId],
    queryFn: async () => {
      const res = await fetch(`/api/arrangement-guests?arrangement_id=${arrangementId}`);
      if (!res.ok) throw new Error('게스트 목록 조회 실패');
      return res.json() as Promise<ArrangementGuest[]>;
    },
    enabled: !!arrangementId,
  });
}

/**
 * 게스트 멤버를 배치표에 연결
 */
export function useAddArrangementGuests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ arrangementId, memberIds }: { arrangementId: string; memberIds: string[] }) => {
      const res = await fetch('/api/arrangement-guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrangement_id: arrangementId, member_ids: memberIds }),
      });
      if (!res.ok) throw new Error('게스트 연결 실패');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['arrangement-guests', variables.arrangementId] });
    },
  });
}

/**
 * 게스트 멤버를 배치표에서 연결 해제
 */
export function useRemoveArrangementGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ arrangementId, memberId }: { arrangementId: string; memberId: string }) => {
      const res = await fetch('/api/arrangement-guests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrangement_id: arrangementId, member_id: memberId }),
      });
      if (!res.ok) throw new Error('게스트 연결 해제 실패');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['arrangement-guests', variables.arrangementId] });
    },
  });
}
