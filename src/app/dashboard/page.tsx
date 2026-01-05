'use client';

import Navigation from '@/components/layout/Navigation';
import DashboardStats from '@/components/features/dashboard/DashboardStats';
import QuickActions from '@/components/features/dashboard/QuickActions';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
    const { profile } = useAuth();

    return (
        <div className="min-h-screen bg-[var(--color-background-tertiary)]">
            <Navigation />

            <div className="py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* 환영 메시지 */}
                    <div>
                        <h2 className="heading-2 text-[var(--color-text-primary)]">
                            안녕하세요, {profile?.name || '지휘자'}님!
                        </h2>
                        <p className="mt-2 body-base text-[var(--color-text-secondary)]">
                            오늘도 찬양대와 함께 은혜로운 시간 되세요.
                        </p>
                    </div>

                    {/* 통계 카드 */}
                    <section>
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                            현황 요약
                        </h3>
                        <DashboardStats />
                    </section>

                    {/* 빠른 실행 */}
                    <section>
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                            빠른 실행
                        </h3>
                        <QuickActions />
                    </section>

                    {/* 최근 활동 (Placeholder) */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 최근 배치표 */}
                        <div className="bg-white p-6 rounded-lg shadow border border-[var(--color-border-default)]">
                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                                최근 배치표
                            </h3>
                            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
                                <p>아직 생성된 배치표가 없습니다.</p>
                            </div>
                        </div>

                        {/* 다가오는 일정 */}
                        <div className="bg-white p-6 rounded-lg shadow border border-[var(--color-border-default)]">
                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                                이번 주 일정
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded-md">
                                    <div>
                                        <p className="font-medium text-[var(--color-text-primary)]">주일 오전 연습</p>
                                        <p className="text-sm text-[var(--color-text-secondary)]">11월 24일 (일) 09:30</p>
                                    </div>
                                    <span className="text-xs font-medium px-2 py-1 bg-[var(--color-primary-100)] text-[var(--color-primary-700)] rounded">
                                        예정
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded-md">
                                    <div>
                                        <p className="font-medium text-[var(--color-text-primary)]">주일 오후 연습</p>
                                        <p className="text-sm text-[var(--color-text-secondary)]">11월 24일 (일) 13:30</p>
                                    </div>
                                    <span className="text-xs font-medium px-2 py-1 bg-[var(--color-primary-100)] text-[var(--color-primary-700)] rounded">
                                        예정
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
