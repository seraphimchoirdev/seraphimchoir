'use client';

import { useAuth } from '@/hooks/useAuth';
import AppShell from '@/components/layout/AppShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const managementMenuItems = [
  { href: '/management', label: '대시보드', exact: true },
  { href: '/management/statistics', label: '출석 통계' },
  { href: '/management/documents', label: '문서 아카이브' },
];

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, hasRole } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[var(--color-background-tertiary)] flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      </AppShell>
    );
  }

  // STAFF 이상 권한만 접근 가능 (ADMIN, CONDUCTOR, MANAGER, STAFF)
  if (!hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'STAFF'])) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[var(--color-background-tertiary)]">
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Alert variant="error">
              <AlertDescription className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                임원 포털에 접근할 권한이 없습니다. 임원(STAFF 이상) 권한이 필요합니다.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)]">
        {/* 임원 포털 서브 네비게이션 */}
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-1 py-2">
              <Briefcase className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-sm font-medium text-[var(--color-primary)] mr-4">
                임원 포털
              </span>
              <nav className="flex gap-1">
                {managementMenuItems.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        isActive
                          ? 'bg-[var(--color-primary-600)] text-white'
                          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* 페이지 콘텐츠 */}
        {children}
      </div>
    </AppShell>
  );
}
