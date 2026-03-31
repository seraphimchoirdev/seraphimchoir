'use client';

import { ClipboardList, Users } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getPartLabel } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import useDashboardContext from '@/hooks/dashboard/useDashboardContext';
import useMyDashboardStatus from '@/hooks/dashboard/useMyDashboardStatus';

import UpcomingService from '../common/UpcomingService';
import MemberLinkBanner from './MemberLinkBanner';
import MySeatCard from './MySeatCard';
import VoteActionCard from './VoteActionCard';

/**
 * 대원 대시보드
 *
 * 개인 행동 중심의 화면을 제공합니다.
 * - 대원 연결 안내 (미연결 시)
 * - 출석 투표 행동 유도
 * - 내 좌석 위치 (배치표 공유 후)
 * - 다음 예배 정보
 */
export function MemberDashboard() {
  const { profile } = useAuth();
  const { data: context, isLoading: contextLoading } = useDashboardContext();
  const { data: myStatus, isLoading: statusLoading } = useMyDashboardStatus();

  const displayName = profile?.linked_member?.name || profile?.name || '대원';
  const isLoading = contextLoading || statusLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-5 w-64" />
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  // 대원 연결이 안 된 경우
  if (!myStatus?.isLinked) {
    return (
      <div className="space-y-6">
        {/* 환영 메시지 */}
        <div className="rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-primary-50)] via-[var(--color-background-primary)] to-[var(--color-accent-50)] p-6">
          <h2 className="heading-2 text-[var(--color-text-primary)]">
            안녕하세요, {displayName}님
          </h2>
          <p className="body-base mt-1 text-[var(--color-text-secondary)]">
            새로핌찬양대에 오신 것을 환영합니다.
          </p>
        </div>

        {/* 대원 연결 안내 배너 */}
        <MemberLinkBanner linkStatus={myStatus?.linkStatus || null} />

        {/* 다음 예배 정보 (연결 없이도 표시) */}
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
      </div>
    );
  }

  // 대원 연결된 경우 - 풀 대시보드
  const hasVoted = !!myStatus.myVote;
  const isAvailable = myStatus.myVote?.isAvailable;
  const showSeatCard =
    myStatus.mySeat &&
    (context?.timeContext === 'ARRANGEMENT_SHARED' || context?.timeContext === 'SERVICE_DAY');
  const showVoteCard =
    context?.timeContext === 'VOTE_NEEDED' ||
    context?.timeContext === 'VOTE_COMPLETED' ||
    context?.timeContext === 'VOTE_CLOSED';

  return (
    <div className="space-y-6">
      {/* 환영 메시지 */}
      <div className="rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-primary-50)] via-[var(--color-background-primary)] to-[var(--color-accent-50)] p-6">
        <h2 className="heading-2 text-[var(--color-text-primary)]">안녕하세요, {displayName}님</h2>
        <p className="body-base mt-1 text-[var(--color-text-secondary)]">
          오늘도 찬양대와 함께 은혜로운 시간 되세요.
        </p>
      </div>

      {/* 파트장 바로가기 */}
      {profile?.role === 'PART_LEADER' && (
        <Card className="border-[var(--color-border-default)]">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]">
              {profile.linked_member?.part
                ? `${getPartLabel(profile.linked_member.part)} 파트장 바로가기`
                : '파트장 바로가기'}
            </h3>
            <div className="flex flex-col gap-2">
              <Link
                href="/attendances"
                className="flex items-center gap-3 rounded-lg p-2 transition-all duration-200 hover:bg-[var(--color-background-tertiary)] active:scale-[0.99]"
              >
                <div className="rounded-full bg-[var(--color-primary-100)] p-2">
                  <ClipboardList className="h-4 w-4 text-[var(--color-primary-600)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">출석 관리</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    내 파트 출석 체크하러 가기
                  </p>
                </div>
                <span className="text-[var(--color-text-tertiary)]">&rarr;</span>
              </Link>
              <Link
                href="/management/members"
                className="flex items-center gap-3 rounded-lg p-2 transition-all duration-200 hover:bg-[var(--color-background-tertiary)] active:scale-[0.99]"
              >
                <div className="rounded-full bg-[var(--color-primary-100)] p-2">
                  <Users className="h-4 w-4 text-[var(--color-primary-600)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">대원 관리</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    파트 대원 정보 관리하기
                  </p>
                </div>
                <span className="text-[var(--color-text-tertiary)]">&rarr;</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 출석 투표 행동 유도 */}
      {showVoteCard && context && (
        <VoteActionCard
          timeContext={context.timeContext}
          nextServiceDate={context.nextServiceDate || myStatus.nextServiceDate}
          voteDeadline={context.voteDeadline}
          voteDeadlineDisplay={context.voteDeadlineDisplay}
          hasVoted={hasVoted}
          isAvailable={isAvailable}
        />
      )}

      {/* 내 좌석 (배치표 공유 후) */}
      {showSeatCard && myStatus.mySeat && profile?.linked_member_id && (
        <MySeatCard seat={myStatus.mySeat} memberId={profile.linked_member_id} />
      )}

      {/* 다음 예배 정보 */}
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
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-56 rounded-lg" />
    </div>
  );
}

export default MemberDashboard;
