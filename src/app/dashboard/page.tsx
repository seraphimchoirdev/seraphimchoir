'use client';

import AppShell from '@/components/layout/AppShell';
import ConductorDashboard from '@/components/features/dashboard/conductor/ConductorDashboard';
import MemberDashboard from '@/components/features/dashboard/member/MemberDashboard';
import StaffDashboard from '@/components/features/dashboard/staff/StaffDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';

/**
 * 대시보드 페이지
 *
 * 사용자 역할에 따라 다른 대시보드를 표시합니다.
 *
 * - CONDUCTOR: 배치 작업 중심 대시보드
 * - ADMIN, MANAGER, STAFF: 임원 대시보드 (대원 기능 + 관리 기능)
 * - MEMBER, PART_LEADER, 기타: 대원 대시보드 (개인 행동 중심)
 */
export default function DashboardPage() {
  const { profile, isLoading } = useAuth();
  const role = profile?.role;

  // 로딩 중
  if (isLoading) {
    return (
      <AppShell>
        <DashboardContainer>
          <LoadingSkeleton />
        </DashboardContainer>
      </AppShell>
    );
  }

  // 지휘자 → 배치 작업 중심 대시보드
  if (role === 'CONDUCTOR') {
    return (
      <AppShell>
        <DashboardContainer>
          <ConductorDashboard />
        </DashboardContainer>
      </AppShell>
    );
  }

  // 임원 (ADMIN, MANAGER, STAFF) → 대원 기능 + 관리 기능
  if (role === 'ADMIN' || role === 'MANAGER' || role === 'STAFF') {
    return (
      <AppShell>
        <DashboardContainer>
          <StaffDashboard />
        </DashboardContainer>
      </AppShell>
    );
  }

  // 대원, 파트장, 기타 → 개인 행동 중심 대시보드
  return (
    <AppShell>
      <DashboardContainer>
        <MemberDashboard />
      </DashboardContainer>
    </AppShell>
  );
}

function DashboardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background-tertiary)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>
      <Skeleton className="h-24 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  );
}
