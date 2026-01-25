'use client';

import BottomNavigation from './BottomNavigation';
import Navigation from './Navigation';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell - 애플리케이션 쉘 레이아웃
 *
 * Navigation(상단)과 BottomNavigation(모바일 하단)을 함께 렌더링합니다.
 * 모바일에서 하단 내비게이션 바로 인해 가려지지 않도록 콘텐츠에 하단 패딩이 적용됩니다.
 */
export default function AppShell({ children }: AppShellProps) {
  return (
    <>
      <Navigation />
      <main className="pb-bottom-nav">{children}</main>
      <BottomNavigation />
    </>
  );
}
