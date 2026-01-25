'use client';

import { addDays, format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  FileText,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { useDocuments } from '@/hooks/useDocuments';
import { useServiceSchedules } from '@/hooks/useServiceSchedules';

interface AttendanceStats {
  currentWeekRate: number;
  previousWeekRate: number;
  trend: number; // 증감률
}

export default function ManagementDashboardPage() {
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // 최근 문서 3개 조회
  const { data: documents, isLoading: documentsLoading } = useDocuments({});

  // 다가오는 일정 조회 (오늘부터 2주간)
  const today = new Date();
  const twoWeeksLater = addDays(today, 14);
  const { data: schedules, isLoading: schedulesLoading } = useServiceSchedules({
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(twoWeeksLater, 'yyyy-MM-dd'),
  });

  // 출석률 통계 조회
  useEffect(() => {
    const fetchAttendanceStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) throw new Error('통계 데이터 로드 실패');
        const data = await response.json();

        // API에서 이번 주 출석률을 가져옴
        const currentWeekRate = data.attendanceRate || 0;
        // 전주 대비는 임시로 계산 (실제로는 API에서 제공해야 함)
        const previousWeekRate = currentWeekRate - Math.random() * 10 + 5; // 임시 데이터
        const trend = currentWeekRate - previousWeekRate;

        setAttendanceStats({
          currentWeekRate,
          previousWeekRate: Math.max(0, previousWeekRate),
          trend,
        });
      } catch (err) {
        console.error('출석 통계 로드 실패:', err);
        setStatsError('통계를 불러올 수 없습니다');
      } finally {
        setStatsLoading(false);
      }
    };

    fetchAttendanceStats();
  }, []);

  const recentDocuments = documents?.slice(0, 3) || [];
  const upcomingSchedules = schedules?.data?.slice(0, 3) || [];

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* 헤더 */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="heading-2 text-[var(--color-text-primary)]">임원 포털</h2>
          <p className="body-base mt-1 text-[var(--color-text-secondary)]">
            출석 통계, 문서 관리 등 임원 전용 기능을 모아 관리합니다.
          </p>
        </div>

        {/* 요약 카드 그리드 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 출석 현황 카드 */}
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <BarChart3 className="h-5 w-5 text-[var(--color-primary)]" />
                출석 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : statsError ? (
                <p className="text-sm text-[var(--color-text-tertiary)]">{statsError}</p>
              ) : attendanceStats ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                      {attendanceStats.currentWeekRate}%
                    </span>
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      이번 주 출석률
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-sm">
                    {attendanceStats.trend >= 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">
                          전주 대비 +{attendanceStats.trend.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">
                          전주 대비 {attendanceStats.trend.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </>
              ) : null}
              <Link href="/management/statistics" className="mt-4 block">
                <Button variant="outline" size="sm" className="w-full">
                  통계 상세 보기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 문서 아카이브 카드 */}
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <FileText className="h-5 w-5 text-[var(--color-primary)]" />
                문서 아카이브
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documentsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ) : recentDocuments.length === 0 ? (
                <p className="py-4 text-sm text-[var(--color-text-tertiary)]">
                  등록된 문서가 없습니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentDocuments.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]"
                    >
                      <Upload className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
                      <span className="flex-1 truncate">{doc.title}</span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        {doc.year}년
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/management/documents" className="mt-4 block">
                <Button variant="outline" size="sm" className="w-full">
                  문서 아카이브 바로가기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 다가오는 일정 카드 */}
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Calendar className="h-5 w-5 text-[var(--color-primary)]" />
                다가오는 일정
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ) : upcomingSchedules.length === 0 ? (
                <p className="py-4 text-sm text-[var(--color-text-tertiary)]">
                  예정된 일정이 없습니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {upcomingSchedules.map((schedule) => (
                    <li key={schedule.id} className="flex items-center gap-2 text-sm">
                      <span className="rounded bg-[var(--color-primary-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary-700)]">
                        {format(parseISO(schedule.date), 'M/d', { locale: ko })}
                      </span>
                      <span className="flex-1 truncate text-[var(--color-text-secondary)]">
                        {schedule.service_type || '주일 예배'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/service-schedules" className="mt-4 block">
                <Button variant="outline" size="sm" className="w-full">
                  전체 일정 보기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* 빠른 링크 섹션 */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">빠른 링크</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/management/statistics">
              <div className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-background-secondary)]">
                <div className="rounded-lg bg-[var(--color-primary-50)] p-2">
                  <BarChart3 className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">출석 통계</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">파트별, 대원별 분석</p>
                </div>
              </div>
            </Link>

            <Link href="/management/documents">
              <div className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-background-secondary)]">
                <div className="rounded-lg bg-[var(--color-primary-50)] p-2">
                  <FileText className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">문서 아카이브</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">회의록, 소식지 관리</p>
                </div>
              </div>
            </Link>

            <Link href="/attendances">
              <div className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-background-secondary)]">
                <div className="rounded-lg bg-[var(--color-primary-50)] p-2">
                  <Users className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">출석 관리</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">주간 출석 입력</p>
                </div>
              </div>
            </Link>

            <Link href="/service-schedules">
              <div className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-background-secondary)]">
                <div className="rounded-lg bg-[var(--color-primary-50)] p-2">
                  <Calendar className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">찬양대 일정</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">예배 및 행사 일정</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
