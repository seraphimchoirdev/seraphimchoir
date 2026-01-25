'use client';

import DashboardStats from '@/components/features/dashboard/DashboardStats';
import QuickActions from '@/components/features/dashboard/QuickActions';
import AppShell from '@/components/layout/AppShell';

import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { profile } = useAuth();

  // 연결된 대원 이름을 우선 표시, 없으면 profile.name (카카오 닉네임)
  const displayName = profile?.linked_member?.name || profile?.name || '사용자';

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* 환영 메시지 */}
          <div>
            <h2 className="heading-2 text-[var(--color-text-primary)]">
              안녕하세요, {displayName}님!
            </h2>
            <p className="body-base mt-2 text-[var(--color-text-secondary)]">
              오늘도 찬양대와 함께 은혜로운 시간 되세요.
            </p>
          </div>

          {/* 통계 카드 */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
              현황 요약
            </h3>
            <DashboardStats />
          </section>

          {/* 빠른 실행 */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
              빠른 실행
            </h3>
            <QuickActions />
          </section>

          {/* 최근 활동 (Placeholder) */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 최근 배치표 */}
            <div className="rounded-lg border border-[var(--color-border-default)] bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
                최근 배치표
              </h3>
              <div className="py-8 text-center text-[var(--color-text-tertiary)]">
                <p>아직 생성된 배치표가 없습니다.</p>
              </div>
            </div>

            {/* 다가오는 일정 */}
            <div className="rounded-lg border border-[var(--color-border-default)] bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
                이번 주 일정
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-md bg-[var(--color-background-secondary)] p-3">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">주일 오전 연습</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      11월 24일 (일) 09:30
                    </p>
                  </div>
                  <span className="rounded bg-[var(--color-primary-100)] px-2 py-1 text-xs font-medium text-[var(--color-primary-700)]">
                    예정
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-[var(--color-background-secondary)] p-3">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">주일 오후 연습</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      11월 24일 (일) 13:30
                    </p>
                  </div>
                  <span className="rounded bg-[var(--color-primary-100)] px-2 py-1 text-xs font-medium text-[var(--color-primary-700)]">
                    예정
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
