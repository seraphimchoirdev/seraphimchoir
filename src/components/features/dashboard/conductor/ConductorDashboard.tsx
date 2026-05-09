'use client';

import { CalendarDays, LayoutGrid, UserPlus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import useConductorStatus from '@/hooks/dashboard/useConductorStatus';
import useDashboardContext from '@/hooks/dashboard/useDashboardContext';

import UpcomingService from '../common/UpcomingService';
import ArrangementActionCard from './ArrangementActionCard';
import AttendanceSummaryCard from './AttendanceSummaryCard';

type SubtitleColor = 'success' | 'primary' | 'default';

function getWelcomeSubtitle(
  hasArrangement: boolean | undefined,
  isSaturday: boolean,
): { text: string; color: SubtitleColor } {
  if (hasArrangement) {
    return { text: '이번 주 자리배치가 완료되었습니다.', color: 'success' };
  }
  return isSaturday
    ? { text: '오늘은 자리배치를 마감하는 날입니다.', color: 'primary' }
    : { text: '이번 주 현황을 확인하세요.', color: 'default' };
}

/**
 * 지휘자 대시보드
 *
 * 배치 작업 중심의 화면을 제공합니다.
 * - 배치 작업 현황 (최우선)
 * - 출석 현황 요약
 * - 다음 예배 정보
 * - 빠른 실행 메뉴
 */
export function ConductorDashboard() {
  const { profile } = useAuth();
  const { data: context, isLoading: contextLoading } = useDashboardContext();
  const { data: status, isLoading: statusLoading } = useConductorStatus();

  const displayName = profile?.linked_member?.name || profile?.name || '지휘자';
  const isLoading = contextLoading || statusLoading;

  const isSaturday = new Date().getDay() === 6;
  const hasArrangement = !!status?.latestArrangement;

  const subtitle = getWelcomeSubtitle(hasArrangement, isSaturday);

  const subtitleColorClass =
    subtitle.color === 'success'
      ? 'text-[var(--color-success-600)]'
      : subtitle.color === 'primary'
        ? 'text-[var(--color-primary-600)]'
        : 'text-[var(--color-text-secondary)]';

  return (
    <div className="space-y-6">
      {/* 환영 메시지 */}
      <div className="rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-primary-50)] via-[var(--color-background-primary)] to-[var(--color-accent-50)] p-6">
        <h2 className="heading-2 text-[var(--color-text-primary)]">안녕하세요, {displayName}님</h2>
        <p className={`body-base mt-1 ${subtitleColorClass}`}>
          {subtitle.text}
        </p>
      </div>

      {/* 메인 콘텐츠 */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 좌측: 배치 작업 현황 */}
          <div className="space-y-6">
            <ArrangementActionCard
              arrangement={status?.latestArrangement || null}
              nextServiceDate={status?.nextServiceDate || context?.nextServiceDate || ''}
            />

            {status?.attendanceSummaries && status.attendanceSummaries.length > 0 && (
              <AttendanceSummaryCard
                nextServiceDate={status.nextServiceDate}
                summaries={status.attendanceSummaries}
              />
            )}
          </div>

          {/* 우측: 다음 예배 정보 + 빠른 실행 */}
          <div className="space-y-6">
            {context?.nextServiceInfo && (
              <UpcomingService
                date={context.nextServiceInfo.date}
                serviceType={context.nextServiceInfo.serviceType}
                hymnName={context.nextServiceInfo.hymnName}
                hoodColor={context.nextServiceInfo.hoodColor}
                serviceStartTime={context.nextServiceInfo.serviceStartTime}
                prePracticeStartTime={context.nextServiceInfo.prePracticeStartTime}
              />
            )}

            {/* 빠른 실행 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">빠른 실행</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    asChild
                    variant="outline"
                    className="flex h-auto flex-col items-center gap-2 py-3"
                  >
                    <Link href="/arrangements/new">
                      <LayoutGrid className="h-4 w-4" />
                      <span className="text-xs">새 배치</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="flex h-auto flex-col items-center gap-2 py-3"
                  >
                    <Link href="/attendances">
                      <CalendarDays className="h-4 w-4" />
                      <span className="text-xs">출석 관리</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="flex h-auto flex-col items-center gap-2 py-3"
                  >
                    <Link href="/management/members/new">
                      <UserPlus className="h-4 w-4" />
                      <span className="text-xs">대원 등록</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </div>
  );
}

export default ConductorDashboard;
