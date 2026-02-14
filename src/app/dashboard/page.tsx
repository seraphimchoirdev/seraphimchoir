import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import DashboardContent from '@/components/features/dashboard/DashboardContent';
import { DashboardLoadingSkeleton } from '@/components/features/dashboard/DashboardContent';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  fetchDashboardContext,
  fetchMyDashboardStatus,
  fetchConductorStatus,
  fetchPendingApprovals,
} from '@/lib/dashboard-data';

/**
 * 데이터 프리패치를 수행하는 async Server Component
 *
 * Suspense 경계 안에서 렌더되므로, 데이터 로딩 중에도 AppShell은 즉시 스트리밍됩니다.
 */
async function DashboardPrefetcher({
  role,
  userId,
  profile,
}: {
  role: string | null;
  userId: string;
  profile: { linked_member_id: string | null; link_status: string | null } | null;
}) {
  const adminSupabase = await createAdminClient();
  const queryClient = new QueryClient();

  const userProfile = {
    id: userId,
    role,
    linked_member_id: profile?.linked_member_id || null,
    link_status: profile?.link_status as 'pending' | 'approved' | 'rejected' | null,
  };

  const prefetchPromises: Promise<void>[] = [];

  prefetchPromises.push(
    queryClient.prefetchQuery({
      queryKey: ['dashboard-context'],
      queryFn: () => fetchDashboardContext(adminSupabase, userProfile),
    })
  );

  if (role !== 'CONDUCTOR') {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['dashboard-my-status'],
        queryFn: () => fetchMyDashboardStatus(adminSupabase, userProfile),
      })
    );
  }

  if (role === 'CONDUCTOR') {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['dashboard-conductor-status'],
        queryFn: () => fetchConductorStatus(adminSupabase),
      })
    );
  }

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
      <DashboardContent role={role} />
    </HydrationBoundary>
  );
}

/**
 * 대시보드 페이지 (Server Component)
 *
 * AppShell을 즉시 스트리밍하고, 데이터 프리패치는 Suspense 경계 안에서 수행합니다.
 * 사용자는 셸(네비게이션 + 스켈레톤)을 먼저 보고, 데이터가 준비되면 콘텐츠가 나타납니다.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 프로필 조회 (Suspense 밖에서 수행 — role에 따라 셸 구조가 달라질 수 있음)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, linked_member_id, link_status')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || null;

  return (
    <AppShell>
      <Suspense fallback={<DashboardLoadingSkeleton />}>
        <DashboardPrefetcher role={role} userId={user.id} profile={profile} />
      </Suspense>
    </AppShell>
  );
}
