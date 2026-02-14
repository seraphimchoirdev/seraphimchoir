import { redirect } from 'next/navigation';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import DashboardContent from '@/components/features/dashboard/DashboardContent';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  fetchDashboardContext,
  fetchMyDashboardStatus,
  fetchConductorStatus,
  fetchPendingApprovals,
} from '@/lib/dashboard-data';

/**
 * 대시보드 페이지 (Server Component)
 *
 * 서버에서 1회 인증 + 데이터 프리패치 후, HydrationBoundary로 클라이언트 캐시에 주입합니다.
 * 기존 5회 인증 워터폴을 1회로 줄여 TTFB/FCP를 대폭 개선합니다.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  // 서버에서 1회 인증 (middleware와 같은 요청에서 쿠키를 공유하므로 실질적 중복 없음)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 프로필 조회 (1회)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, linked_member_id, link_status')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || null;
  const adminSupabase = await createAdminClient();

  // React Query 캐시에 서버 데이터를 주입하기 위한 QueryClient
  const queryClient = new QueryClient();

  // 역할에 따라 필요한 데이터만 병렬로 프리패치
  const prefetchPromises: Promise<void>[] = [];

  // 모든 역할: dashboard-context
  prefetchPromises.push(
    queryClient.prefetchQuery({
      queryKey: ['dashboard-context'],
      queryFn: () =>
        fetchDashboardContext(adminSupabase, {
          id: user.id,
          role,
          linked_member_id: profile?.linked_member_id || null,
          link_status: profile?.link_status as 'pending' | 'approved' | 'rejected' | null,
        }),
    })
  );

  // 대원/임원: my-status (지휘자 제외한 모든 역할)
  if (role !== 'CONDUCTOR') {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['dashboard-my-status'],
        queryFn: () =>
          fetchMyDashboardStatus(adminSupabase, {
            id: user.id,
            role,
            linked_member_id: profile?.linked_member_id || null,
            link_status: profile?.link_status as 'pending' | 'approved' | 'rejected' | null,
          }),
      })
    );
  }

  // 지휘자: conductor-status
  if (role === 'CONDUCTOR') {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['dashboard-conductor-status'],
        queryFn: () => fetchConductorStatus(adminSupabase),
      })
    );
  }

  // ADMIN: pending-approvals
  if (role === 'ADMIN') {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['dashboard-pending-approvals'],
        queryFn: () => fetchPendingApprovals(adminSupabase),
      })
    );
  }

  await Promise.all(prefetchPromises);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppShell>
        <DashboardContent role={role} />
      </AppShell>
    </HydrationBoundary>
  );
}
