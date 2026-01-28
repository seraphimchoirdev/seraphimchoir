'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, useIsAdmin, usePermission } from '@/hooks/useAuth';
import useDashboardContext from '@/hooks/dashboard/useDashboardContext';
import useMyDashboardStatus from '@/hooks/dashboard/useMyDashboardStatus';
import usePendingApprovals from '@/hooks/dashboard/usePendingApprovals';

import UpcomingService from '../common/UpcomingService';
import MemberLinkBanner from '../member/MemberLinkBanner';
import MySeatCard from '../member/MySeatCard';
import MyRecentVotes from '../member/MyRecentVotes';
import VoteActionCard from '../member/VoteActionCard';
import EmergencyActionCard from './EmergencyActionCard';
import PendingApprovalsCard from './PendingApprovalsCard';

/**
 * 임원 대시보드
 *
 * 대원 대시보드를 기반으로, 역할과 시간 컨텍스트에 따라 관리 기능을 추가합니다.
 *
 * - 기본: 대원 대시보드와 동일 (출석 투표, 내 좌석, 예배 정보)
 * - ADMIN: 승인 대기 건 알림
 * - MANAGER + 주일 당일: 긴급 배치표 수정 카드
 */
export function StaffDashboard() {
  const { profile } = useAuth();
  const isAdmin = useIsAdmin();
  const canEmergencyEdit = usePermission('canEmergencyEditArrangements');

  const { data: context, isLoading: contextLoading } = useDashboardContext();
  const { data: myStatus, isLoading: statusLoading } = useMyDashboardStatus();
  const { data: pendingData } = usePendingApprovals(isAdmin);

  const displayName = profile?.linked_member?.name || profile?.name || '대원';
  const isLoading = contextLoading || statusLoading;

  // 대원 기능 관련 상태
  const hasVoted = !!myStatus?.myVote;
  const isAvailable = myStatus?.myVote?.isAvailable;
  const showSeatCard =
    myStatus?.mySeat &&
    (context?.timeContext === 'ARRANGEMENT_SHARED' || context?.timeContext === 'SERVICE_DAY');
  const showVoteCard =
    myStatus?.isLinked &&
    (context?.timeContext === 'VOTE_NEEDED' ||
      context?.timeContext === 'VOTE_COMPLETED' ||
      context?.timeContext === 'VOTE_CLOSED');

  // 긴급 수정 카드 표시 조건: 주일 당일 + 긴급수정 권한 + 배치표 존재
  const showEmergencyCard =
    context?.timeContext === 'SERVICE_DAY' &&
    canEmergencyEdit &&
    context?.hasArrangement &&
    myStatus?.mySeat?.arrangementId;

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

  return (
    <div className="space-y-6">
      {/* 환영 메시지 */}
      <div>
        <h2 className="heading-2 text-[var(--color-text-primary)]">안녕하세요, {displayName}님!</h2>
        <p className="body-base mt-1 text-[var(--color-text-secondary)]">
          {myStatus?.linkedMemberPart && `${myStatus.linkedMemberPart} 파트 | `}
          오늘도 찬양대와 함께 은혜로운 시간 되세요.
        </p>
      </div>

      {/* ADMIN 전용: 승인 대기 건 (있을 때만) */}
      {isAdmin && pendingData && pendingData.pendingApprovals.length > 0 && (
        <PendingApprovalsCard approvals={pendingData.pendingApprovals} />
      )}

      {/* 총무/부총무: 주일 당일 긴급 수정 카드 */}
      {showEmergencyCard && myStatus?.mySeat && (
        <EmergencyActionCard
          arrangementId={myStatus.mySeat.arrangementId}
          arrangementDate={myStatus.mySeat.arrangementDate}
        />
      )}

      {/* 대원 연결이 안 된 경우 */}
      {!myStatus?.isLinked ? (
        <>
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
        </>
      ) : (
        <>
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
        </>
      )}
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

export default StaffDashboard;
