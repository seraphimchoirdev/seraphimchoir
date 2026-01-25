/**
 * useMyProfile Hook
 *
 * 내 프로필 및 연결된 대원 정보 조회/수정
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface LinkedMember {
  id: string;
  name: string;
  part: string;
  height_cm: number | null;
  regular_member_since: string | null;
  last_service_date: string | null;
  last_practice_date: string | null;
}

interface MyProfile {
  id: string;
  email: string;
  name: string;
  role: string | null;
  linked_member_id: string | null;
  link_status: 'pending' | 'approved' | 'rejected' | null;
  member: LinkedMember | null;
}

interface UpdateProfileInput {
  height_cm?: number;
  regular_member_since?: string | null;
}

// 내 프로필 조회
export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: async (): Promise<MyProfile> => {
      const res = await fetch('/api/my-profile');

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '프로필을 불러오는데 실패했습니다.');
      }

      return res.json();
    },
  });
}

// 내 프로필 수정 (키, 정대원 임명일)
export function useUpdateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileInput) => {
      const res = await fetch('/api/my-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '정보 수정에 실패했습니다.');
      }

      return res.json();
    },
    onSuccess: async () => {
      // 저장 후 즉시 데이터 리페치
      await queryClient.refetchQueries({ queryKey: ['my-profile'] });
    },
  });
}
