/**
 * useMemberLink Hook
 *
 * 대원 연결(Member Linking) 관련 React Query 훅
 * - 연결 가능한 대원 목록 조회
 * - 연결 요청 생성
 * - 대기중인 연결 요청 조회 (관리자용)
 * - 연결 승인/거부
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// 연결 가능한 대원 (아직 연결되지 않은 정대원)
interface AvailableMember {
  id: string;
  name: string;
  part: string;
}

// 연결 요청 정보 (member는 Supabase 관계 조회로 인해 배열로 반환됨)
interface MemberLinkRequestRaw {
  id: string;
  email: string;
  name: string;  // 카카오 이름
  linked_member_id: string;
  link_status: 'pending' | 'approved' | 'rejected';
  link_requested_at: string;
  member: {
    id: string;
    name: string;
    part: string;
  }[];
}

// 변환된 연결 요청 정보 (단일 member 객체)
interface MemberLinkRequest {
  id: string;
  email: string;
  name: string;
  linked_member_id: string;
  link_status: 'pending' | 'approved' | 'rejected';
  link_requested_at: string;
  member: {
    id: string;
    name: string;
    part: string;
  } | null;
}

// 연결 가능한 대원 목록 조회
export function useAvailableMembers(part?: string) {
  return useQuery({
    queryKey: ['available-members', part],
    queryFn: async () => {
      const supabase = createClient();

      // 이미 연결된 member_id 목록 조회
      const { data: linkedProfiles } = await supabase
        .from('user_profiles')
        .select('linked_member_id')
        .not('linked_member_id', 'is', null)
        .eq('link_status', 'approved');

      const linkedMemberIds = linkedProfiles?.map(p => p.linked_member_id) || [];

      // 연결되지 않은 정대원 조회
      let query = supabase
        .from('members')
        .select('id, name, part')
        .eq('member_status', 'REGULAR')
        .order('name');

      // 파트 필터
      if (part) {
        query = query.eq('part', part);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 이미 연결된 대원 제외
      const availableMembers = data?.filter(m => !linkedMemberIds.includes(m.id)) || [];

      return availableMembers as AvailableMember[];
    },
  });
}

// 연결 요청 생성
export function useRequestMemberLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch('/api/member-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '연결 요청에 실패했습니다.');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-members'] });
      queryClient.invalidateQueries({ queryKey: ['pending-link-requests'] });
    },
  });
}

// 대기중인 연결 요청 조회 (관리자/파트장용)
export function usePendingLinkRequests(part?: string) {
  return useQuery({
    queryKey: ['pending-link-requests', part],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          name,
          linked_member_id,
          link_status,
          link_requested_at,
          member:members!user_profiles_linked_member_id_fkey(
            id,
            name,
            part
          )
        `)
        .eq('link_status', 'pending')
        .order('link_requested_at', { ascending: false });

      if (error) throw error;

      // member 배열 또는 단일 객체를 처리
      const rawRequests = (data || []) as MemberLinkRequestRaw[];
      let requests: MemberLinkRequest[] = rawRequests.map(r => ({
        ...r,
        member: r.member
          ? (Array.isArray(r.member) ? r.member[0] : r.member)
          : null,
      }));

      // 파트 필터링 (클라이언트 측)
      if (part && requests.length > 0) {
        requests = requests.filter(r => r.member?.part === part);
      }

      return requests;
    },
  });
}

// 연결 승인
export function useApproveMemberLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/member-link/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '승인에 실패했습니다.');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-link-requests'] });
      queryClient.invalidateQueries({ queryKey: ['available-members'] });
    },
  });
}

// 연결 거부
export function useRejectMemberLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/member-link/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '거부에 실패했습니다.');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-link-requests'] });
      queryClient.invalidateQueries({ queryKey: ['available-members'] });
    },
  });
}

// 내 연결 상태 조회 반환 타입
interface MyLinkStatus {
  linked_member_id: string | null;
  link_status: 'pending' | 'approved' | 'rejected' | null;
  link_requested_at: string | null;
  member: {
    id: string;
    name: string;
    part: string;
  } | null;
}

// 내 연결 상태 조회
export function useMyLinkStatus() {
  return useQuery({
    queryKey: ['my-link-status'],
    queryFn: async (): Promise<MyLinkStatus | null> => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          linked_member_id,
          link_status,
          link_requested_at,
          member:members!user_profiles_linked_member_id_fkey(
            id,
            name,
            part
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // member 배열 또는 단일 객체를 처리
      // PostgREST는 FK 관계에 따라 배열 또는 단일 객체를 반환할 수 있음
      const memberData = data?.member;
      const member = memberData
        ? (Array.isArray(memberData) ? memberData[0] : memberData)
        : null;

      return {
        linked_member_id: data?.linked_member_id ?? null,
        link_status: data?.link_status as MyLinkStatus['link_status'] ?? null,
        link_requested_at: data?.link_requested_at ?? null,
        member,
      };
    },
  });
}
