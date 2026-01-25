'use client';

import {
  Briefcase,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Home,
  LayoutGrid,
  MoreHorizontal,
  Settings,
  User,
} from 'lucide-react';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  show: boolean;
};

export default function BottomNavigation() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const mounted = useMounted();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  // 역할 확인 헬퍼
  const hasRole = (roles: string[]) => {
    if (!profile?.role) return false;
    return roles.includes(profile.role);
  };

  const isMemberLinked = (): boolean => {
    return !!(profile?.linked_member_id && profile?.link_status === 'approved');
  };

  const isManager = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']);

  // 관리자용 메인 메뉴 (4개 + 더보기)
  const managerMainNav: NavItem[] = [
    { href: '/dashboard', label: '홈', icon: <Home className="h-5 w-5" />, show: true },
    {
      href: '/attendances',
      label: '출석',
      icon: <ClipboardCheck className="h-5 w-5" />,
      show: true,
    },
    { href: '/arrangements', label: '자리', icon: <LayoutGrid className="h-5 w-5" />, show: true },
    { href: '/management', label: '임원', icon: <Briefcase className="h-5 w-5" />, show: true },
  ];

  // 관리자용 더보기 메뉴
  const managerMoreNav: NavItem[] = [
    {
      href: '/service-schedules',
      label: '찬양대 일정',
      icon: <Calendar className="h-5 w-5" />,
      show: true,
    },
    {
      href: '/admin',
      label: '관리자 페이지',
      icon: <Settings className="h-5 w-5" />,
      show: hasRole(['ADMIN']),
    },
    { href: '/mypage', label: '마이페이지', icon: <User className="h-5 w-5" />, show: true }, // 모든 로그인 사용자 접근 가능
  ].filter((item) => item.show);

  // 일반 대원용 메인 메뉴 (4개 + 더보기)
  const memberMainNav: NavItem[] = [
    { href: '/dashboard', label: '홈', icon: <Home className="h-5 w-5" />, show: true },
    {
      href: '/service-schedules',
      label: '일정',
      icon: <Calendar className="h-5 w-5" />,
      show: true,
    },
    { href: '/arrangements', label: '자리', icon: <LayoutGrid className="h-5 w-5" />, show: true },
    {
      href: '/my-attendance',
      label: '내 출석',
      icon: <CheckCircle className="h-5 w-5" />,
      show: isMemberLinked(),
    },
  ].filter((item) => item.show);

  // 일반 대원용 더보기 메뉴
  const memberMoreNav: NavItem[] = [
    {
      href: '/management',
      label: '임원 포털',
      icon: <Briefcase className="h-5 w-5" />,
      show: hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'STAFF', 'PART_LEADER']),
    },
    { href: '/mypage', label: '마이페이지', icon: <User className="h-5 w-5" />, show: true }, // 모든 로그인 사용자 접근 가능
  ].filter((item) => item.show);

  const mainNav = isManager ? managerMainNav : memberMainNav;
  const moreNav = isManager ? managerMoreNav : memberMoreNav;

  // 마운트 전이거나 로그인 안된 경우 렌더링 안함
  if (!mounted || !profile) return null;

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const NavButton = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`flex min-w-[64px] flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors ${
          active
            ? 'text-[var(--color-primary-600)]'
            : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
        }`}
      >
        {item.icon}
        <span className="text-[10px] leading-tight font-medium">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* 하단 내비게이션 바 - 모바일만 표시 */}
      <nav className="safe-area-bottom fixed right-0 bottom-0 left-0 z-[var(--z-fixed)] border-t border-[var(--color-border-default)] bg-[var(--color-background-primary)] lg:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
          {mainNav.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}

          {/* 더보기 버튼 */}
          {moreNav.length > 0 && (
            <button
              onClick={() => setMoreSheetOpen(true)}
              className={`flex min-w-[64px] flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors ${
                moreSheetOpen
                  ? 'text-[var(--color-primary-600)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] leading-tight font-medium">더보기</span>
            </button>
          )}
        </div>
      </nav>

      {/* 더보기 Sheet */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent side="bottom" className="max-h-[70vh]">
          <SheetHeader className="text-left">
            <SheetTitle>더보기</SheetTitle>
            <SheetDescription>추가 메뉴를 선택하세요</SheetDescription>
          </SheetHeader>
          <div className="space-y-1 px-6 pb-6">
            {moreNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreSheetOpen(false)}
                  className={`flex items-center gap-3 rounded-[var(--radius-base)] px-4 py-3 transition-colors ${
                    active
                      ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
                      : 'text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)]'
                  }`}
                >
                  <span
                    className={
                      active
                        ? 'text-[var(--color-primary-600)]'
                        : 'text-[var(--color-text-tertiary)]'
                    }
                  >
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
