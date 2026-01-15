'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Menu, X } from 'lucide-react';

import { useMounted } from '@/hooks/useMounted';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Navigation() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const mounted = useMounted();

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await signOut();

      if (error) {
        console.error('로그아웃 에러:', error);
        alert('로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.');
        setIsLoggingOut(false);
        setIsLogoutDialogOpen(false);
      }
      // 성공 시 signOut 함수 내부에서 리다이렉트됨
    } catch (err) {
      console.error('로그아웃 예외:', err);
      alert('로그아웃 중 오류가 발생했습니다.');
      setIsLoggingOut(false);
      setIsLogoutDialogOpen(false);
    }
  };

  // 역할에 따른 메뉴 구성
  const hasRole = (roles: string[]) => {
    if (!profile?.role) return false;
    return roles.includes(profile.role);
  };

  const isMemberLinked = () => {
    return profile?.linked_member_id && profile?.link_status === 'approved';
  };

  const navLinks = [
    // 모든 로그인 사용자
    { href: '/dashboard', label: '대시보드', show: true },

    // 관리자 페이지 (ADMIN만)
    { href: '/admin', label: '관리자', show: hasRole(['ADMIN']) },

    // 찬양대원 관리 (ADMIN, CONDUCTOR, MANAGER만)
    { href: '/members', label: '찬양대원 관리', show: hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER']) },

    // 출석 관리 (ADMIN, CONDUCTOR, MANAGER, PART_LEADER)
    { href: '/attendances', label: '출석 관리', show: hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']) },
    { href: '/statistics', label: '출석 통계', show: hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']) },

    // 찬양대 일정 (ADMIN, CONDUCTOR, MANAGER, STAFF, PART_LEADER - MEMBER 제외)
    { href: '/service-schedules', label: '찬양대 일정', show: hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'STAFF', 'PART_LEADER']) },

    // 자리배치 (조회는 모든 역할, 편집은 페이지에서 제한)
    { href: '/arrangements', label: '자리배치', show: hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'STAFF', 'PART_LEADER', 'MEMBER']) },

    // 문서 아카이브 (ADMIN, CONDUCTOR, MANAGER, STAFF - 조회 권한)
    { href: '/documents', label: '문서 아카이브', show: hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'STAFF']) },

    // 대원 연결된 사용자용 메뉴 (역할 무관, 대원 연결됨)
    { href: '/my-attendance', label: '내 출석', show: isMemberLinked() },
  ].filter(link => link.show);

  return (
    <>
      <nav className="bg-[var(--color-background-primary)] shadow-[var(--shadow-sm)] border-b border-[var(--color-border-default)] sticky top-0 z-[var(--z-sticky)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* 로고 및 데스크톱 메뉴 */}
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-xl font-bold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] transition-colors"
              >
                찬양대 자리배치 시스템
              </Link>
              {/* 데스크톱 네비게이션 - lg(1024px) 이상에서 표시 */}
              <div className="hidden lg:flex gap-4">
                {navLinks.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`text-sm font-medium transition-colors px-3 py-2 rounded-[var(--radius-base)] ${isActive
                        ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)] hover:text-[var(--color-text-primary)]'
                        }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 데스크톱 사용자 정보 및 로그아웃 - lg(1024px) 이상에서 표시 */}
            <div className="hidden lg:flex items-center gap-4">
              {mounted && user ? (
                <>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {profile?.name || user.email?.split('@')[0] || '사용자'}
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      {profile?.role || '권한 없음'}
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsLogoutDialogOpen(true)}
                    disabled={isLoggingOut}
                    variant="outline"
                    size="sm"
                    className="border-[var(--color-border-default)] hover:bg-[var(--color-error-50)] hover:text-[var(--color-error-600)] hover:border-[var(--color-error-200)]"
                  >
                    {isLoggingOut ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        로그아웃 중...
                      </>
                    ) : (
                      '로그아웃'
                    )}
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" size="sm">로그인</Button>
                </Link>
              )}
            </div>

            {/* 모바일/태블릿 메뉴 버튼 - lg(1024px) 미만에서 표시 */}
            <div className="flex lg:hidden items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="메뉴 토글"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* 모바일/태블릿 메뉴 - lg(1024px) 미만에서 표시 */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t border-[var(--color-border-subtle)] animate-in slide-in-from-top-2">
              <div className="space-y-3">
                {navLinks.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-[var(--radius-base)] text-base font-medium transition-colors ${isActive
                        ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)] hover:text-[var(--color-text-primary)]'
                        }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <div className="pt-3 border-t border-[var(--color-border-subtle)]">
                  {mounted && user ? (
                    <>
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {profile?.name || user.email?.split('@')[0] || '사용자'}
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          {profile?.role || '권한 없음'}
                        </p>
                      </div>
                      <div className="px-3 pt-2">
                        <Button
                          onClick={() => setIsLogoutDialogOpen(true)}
                          disabled={isLoggingOut}
                          variant="outline"
                          size="sm"
                          className="w-full justify-center border-[var(--color-border-default)] hover:bg-[var(--color-error-50)] hover:text-[var(--color-error-600)] hover:border-[var(--color-error-200)]"
                        >
                          {isLoggingOut ? (
                            <>
                              <Spinner size="sm" className="mr-2" />
                              로그아웃 중...
                            </>
                          ) : (
                            '로그아웃'
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="px-3 py-2">
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start">로그인</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>로그아웃</DialogTitle>
            <DialogDescription>
              정말 로그아웃 하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)} disabled={isLoggingOut}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="bg-[var(--color-error-600)] hover:bg-[var(--color-error-700)] text-white"
            >
              {isLoggingOut ? <Spinner size="sm" className="mr-2" /> : null}
              로그아웃
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
