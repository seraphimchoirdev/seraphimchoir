'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';

function DashboardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background-tertiary)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <DashboardContainer>
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
    </DashboardContainer>
  );
}

const ConductorDashboard = dynamic(
  () => import('@/components/features/dashboard/conductor/ConductorDashboard'),
  { loading: () => <DashboardLoadingSkeleton /> }
);
const MemberDashboard = dynamic(
  () => import('@/components/features/dashboard/member/MemberDashboard'),
  { loading: () => <DashboardLoadingSkeleton /> }
);
const StaffDashboard = dynamic(
  () => import('@/components/features/dashboard/staff/StaffDashboard'),
  { loading: () => <DashboardLoadingSkeleton /> }
);

interface DashboardContentProps {
  role: string | null | undefined;
}

/**
 * 대시보드 콘텐츠 (클라이언트 컴포넌트)
 *
 * 서버에서 프리패치된 데이터는 HydrationBoundary를 통해 React Query 캐시에 주입되므로,
 * 각 대시보드 컴포넌트의 useQuery 훅은 초기 데이터를 캐시에서 즉시 읽습니다.
 */
export default function DashboardContent({ role }: DashboardContentProps) {
  if (role === 'CONDUCTOR') {
    return (
      <DashboardContainer>
        <ConductorDashboard />
      </DashboardContainer>
    );
  }

  if (role === 'ADMIN' || role === 'MANAGER' || role === 'SECRETARY' || role === 'TREASURER') {
    return (
      <DashboardContainer>
        <StaffDashboard />
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <MemberDashboard />
    </DashboardContainer>
  );
}
