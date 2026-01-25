'use client';

import { useQuery } from '@tanstack/react-query';
import { Link2, Loader2, UserCheck, Users } from 'lucide-react';

import Link from 'next/link';

import { createClient } from '@/lib/supabase/client';

export default function AdminDashboardPage() {
  const supabase = createClient();

  // 대기 중인 연결 요청 수
  const { data: pendingCount, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin', 'pending-links-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('link_status', 'pending');

      if (error) throw error;
      return count || 0;
    },
  });

  // 역할별 사용자 통계
  const { data: roleStats, isLoading: roleLoading } = useQuery({
    queryKey: ['admin', 'role-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_profiles').select('role');

      if (error) throw error;

      const stats: Record<string, number> = {
        ADMIN: 0,
        CONDUCTOR: 0,
        MANAGER: 0,
        STAFF: 0,
        PART_LEADER: 0,
        MEMBER: 0,
        NULL: 0,
      };

      data?.forEach((profile) => {
        const role = profile.role || 'NULL';
        stats[role] = (stats[role] || 0) + 1;
      });

      return stats;
    },
  });

  // 전체 사용자 수
  const { data: totalUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'total-users'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const isLoading = pendingLoading || roleLoading || usersLoading;

  const roleLabels: Record<string, string> = {
    ADMIN: '관리자',
    CONDUCTOR: '지휘자',
    MANAGER: '총무',
    STAFF: '임원',
    PART_LEADER: '파트장',
    MEMBER: '대원',
    NULL: '미지정',
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">관리자 대시보드</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          시스템 현황을 확인하고 관리 작업을 수행합니다.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* 전체 사용자 */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[var(--color-primary-50)] p-3">
                  <Users className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">전체 사용자</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {totalUsers}명
                  </p>
                </div>
              </div>
            </div>

            {/* 대기 중인 연결 요청 */}
            <Link
              href="/admin/member-links"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-full p-3 ${
                    (pendingCount || 0) > 0
                      ? 'bg-[var(--color-warning-50)]'
                      : 'bg-[var(--color-success-50)]'
                  }`}
                >
                  <Link2
                    className={`h-6 w-6 ${
                      (pendingCount || 0) > 0
                        ? 'text-[var(--color-warning-600)]'
                        : 'text-[var(--color-success-600)]'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">대기 중인 연결 요청</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {pendingCount}건
                  </p>
                </div>
              </div>
            </Link>

            {/* 역할 할당된 사용자 */}
            <Link
              href="/admin/users"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[var(--color-success-50)] p-3">
                  <UserCheck className="h-6 w-6 text-[var(--color-success-600)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">역할 할당됨</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {(totalUsers || 0) - (roleStats?.NULL || 0)}명
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* 역할별 통계 */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
              역할별 사용자 현황
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
              {Object.entries(roleStats || {}).map(([role, count]) => (
                <div
                  key={role}
                  className="rounded-lg bg-[var(--color-background-secondary)] p-4 text-center"
                >
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">{count}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {roleLabels[role] || role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 빠른 메뉴 */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
              빠른 메뉴
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Link
                href="/admin/users"
                className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-background-secondary)]"
              >
                <Users className="h-8 w-8 text-[var(--color-primary)]" />
                <div>
                  <h3 className="font-medium text-[var(--color-text-primary)]">사용자 관리</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    역할 및 직책 설정, 사용자 검색
                  </p>
                </div>
              </Link>
              <Link
                href="/admin/member-links"
                className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-background-secondary)]"
              >
                <Link2 className="h-8 w-8 text-[var(--color-primary)]" />
                <div>
                  <h3 className="font-medium text-[var(--color-text-primary)]">대원 연결 승인</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    카카오 로그인 사용자의 대원 연결 요청 관리
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
