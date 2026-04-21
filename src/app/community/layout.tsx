'use client';

import { Loader2 } from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import AppShell from '@/components/layout/AppShell';

import { useAuth } from '@/hooks/useAuth';

import { cn } from '@/lib/utils';

const communityTabs = [
  { href: '/community/notices', label: '공지' },
  { href: '/community/feed', label: '소식' },
  { href: '/community/albums', label: '사진' },
  { href: '/community/polls', label: '투표' },
];

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-tertiary)] py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      </AppShell>
    );
  }

  // 현재 활성 탭 판별
  const activeTab = communityTabs.find((tab) =>
    pathname.startsWith(tab.href)
  );

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)]">
        {/* 상단 탭 네비게이션 */}
        <div className="sticky top-0 z-10 border-b border-[var(--color-border-default)] bg-[var(--color-background-primary)]">
          <nav className="mx-auto flex max-w-7xl">
            {communityTabs.map((tab) => {
              const isActive = activeTab?.href === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'flex-1 py-3.5 text-center text-base font-medium transition-colors',
                    isActive
                      ? 'border-b-2 border-[var(--color-primary-600)] text-[var(--color-primary-600)]'
                      : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 콘텐츠 */}
        <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
      </div>
    </AppShell>
  );
}
