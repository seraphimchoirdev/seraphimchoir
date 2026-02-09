import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { getTestAccountPart, isTestAccount } from '@/lib/utils';

type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';

/**
 * 현재 로그인 사용자의 파트를 조회하는 훅
 * - 파트장인 경우 linked_member_id를 통해 members 테이블에서 파트 조회
 * - 테스트 계정은 이메일에서 파트 추출
 */
export function useUserPart() {
  const { profile, user } = useAuth();
  const [userPart, setUserPart] = useState<Part | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchUserPart() {
      if (profile?.role !== 'PART_LEADER' || !user?.email) {
        setUserPart(null);
        return;
      }

      setIsLoading(true);

      // 테스트 계정인 경우 이메일에서 파트 추출
      if (isTestAccount(user.email)) {
        const testPart = getTestAccountPart(user.email);
        if (testPart) setUserPart(testPart);
        setIsLoading(false);
        return;
      }

      // 실제 계정: user_profiles.linked_member_id → members.part
      const supabase = createClient();
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('linked_member_id, members:linked_member_id(part)')
        .eq('id', user.id)
        .single();

      const membersResult = profileData?.members;
      let partValue: Part | null = null;

      if (Array.isArray(membersResult) && membersResult.length > 0) {
        partValue = (membersResult[0] as { part: Part })?.part ?? null;
      } else if (membersResult && typeof membersResult === 'object' && 'part' in membersResult) {
        partValue = (membersResult as { part: Part }).part;
      }

      setUserPart(partValue);
      setIsLoading(false);
    }
    fetchUserPart();
  }, [profile?.role, user?.email, user?.id]);

  return { userPart, isLoading };
}
