import { useMemo } from 'react';

import { useMembers } from '@/hooks/useMembers';

import type { Database } from '@/types/database.types';

export type ArrangementMember = Database['public']['Tables']['members']['Row'];

/**
 * 배치 편집 화면 공용 대원 목록 조회 (코드 리뷰 B11)
 *
 * 기존에는 page/MemberSidebar/SeatsGrid가 동일한 필터(정대원·게스트 등단자)로
 * useMembers를 각각 구독해 총 6개의 옵저버가 생겼다. 이 훅을 페이지 레벨에서
 * 1회만 호출하고 하위 컴포넌트에는 props로 내려보내 구독을 한 곳으로 모은다.
 */
export function useArrangementMembers() {
  // 모든 정대원 조회 (등단자만 - 지휘자/반주자 제외, API limit 최대값: 100)
  const { data: regularData, isLoading: regularLoading } = useMembers({
    member_status: 'REGULAR',
    is_singer: true,
    limit: 100,
  });

  // 게스트 멤버 전체 조회 (매핑 없이 GUEST 상태 멤버를 모든 배치표에서 표시)
  const { data: guestData, isLoading: guestLoading } = useMembers({
    member_status: 'GUEST',
    is_singer: true,
    limit: 100,
  });

  const regularMembers = useMemo(() => regularData?.data ?? [], [regularData?.data]);
  const guestMembers = useMemo(() => guestData?.data ?? [], [guestData?.data]);

  // 멤버별 키(cm) lookup map: memberId → height_cm (SeatsGrid 좌석 툴팁용)
  const heightMap = useMemo(() => {
    const map = new Map<string, number | null>();
    regularMembers.forEach((m) => map.set(m.id, m.height_cm));
    guestMembers.forEach((m) => map.set(m.id, m.height_cm));
    return map;
  }, [regularMembers, guestMembers]);

  return {
    regularMembers,
    guestMembers,
    heightMap,
    isLoading: regularLoading || guestLoading,
  };
}
