'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import useDashboardContext from '@/hooks/dashboard/useDashboardContext';
import useMyDashboardStatus from '@/hooks/dashboard/useMyDashboardStatus';

import UpcomingService from '../common/UpcomingService';
import MemberLinkBanner from './MemberLinkBanner';
import MySeatCard from './MySeatCard';
import MyRecentVotes from './MyRecentVotes';
import VoteActionCard from './VoteActionCard';

/**
 * 대원 대시보드
 *
 * 개인 행동 중심의 화면을 제공합니다.
 * - 대원 연결 안내 (미연결 시)
 * - 출석 투표 행동 유도
 * - 내 좌석 위치 (배치표 공유 후)
 * - 다음 예배 정보
 * - 내 최근 출석 이력
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
        <div>
          <h2 className="heading-2 text-[var(--color-text-primary)]">
            안녕하세요, {displayName}님!
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
      <div>
        <h2 className="heading-2 text-[var(--color-text-primary)]">안녕하세요, {displayName}님!</h2>
        <p className="body-base mt-1 text-[var(--color-text-secondary)]">
          {myStatus.linkedMemberPart && `${myStatus.linkedMemberPart} 파트 | `}
          오늘도 찬양대와 함께 은혜로운 시간 되세요.
        </p>
      </div>

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
      {showSeatCard && myStatus.mySeat && <MySeatCard seat={myStatus.mySeat} />}

      <div className="grid gap-6 lg:grid-cols-2">
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

        {/* 내 최근 출석 */}
        {myStatus.recentVotes.length > 0 && <MyRecentVotes votes={myStatus.recentVotes} />}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  );
}

export default MemberDashboard;
