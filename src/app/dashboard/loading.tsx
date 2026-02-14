import { Skeleton } from '@/components/ui/skeleton';

/**
 * 대시보드 로딩 스켈레톤
 *
 * 실제 대시보드 레이아웃과 일치하는 스켈레톤을 표시하여 CLS를 최소화합니다.
 * AppShell(Navigation + BottomNav)은 layout.tsx에서 렌더링되므로 여기서는 콘텐츠만 표시합니다.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-background-tertiary)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="space-y-6">
          {/* 환영 메시지 영역 */}
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-5 w-64" />
          </div>
          {/* 메인 카드 영역 */}
          <Skeleton className="h-24 rounded-lg" />
          {/* 하단 카드 영역 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-56 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
