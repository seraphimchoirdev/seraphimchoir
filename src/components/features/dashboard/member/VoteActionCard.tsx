'use client';

import { AlertCircle, Calendar, Check, Clock } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDisplayDate, formatTimeUntilDeadline, type TimeContext } from '@/lib/dashboard-context';

interface VoteActionCardProps {
  timeContext: TimeContext;
  nextServiceDate: string;
  voteDeadline: string | null;
  voteDeadlineDisplay: string | null;
  hasVoted: boolean;
  isAvailable?: boolean;
}

/**
 * 출석 투표 행동 유도 카드
 *
 * 시간 컨텍스트에 따라 다른 메시지와 액션을 표시합니다.
 */
export function VoteActionCard({
  timeContext,
  nextServiceDate,
  voteDeadline,
  voteDeadlineDisplay,
  hasVoted,
  isAvailable,
}: VoteActionCardProps) {
  const displayDate = formatDisplayDate(nextServiceDate);

  // 투표 필요
  if (timeContext === 'VOTE_NEEDED') {
    const timeLeft = voteDeadline ? formatTimeUntilDeadline(voteDeadline) : null;

    return (
      <Card className="border-2 border-[var(--color-primary-500)] bg-[var(--color-primary-50)]">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[var(--color-primary-100)] p-2">
              <AlertCircle className="h-5 w-5 text-[var(--color-primary-600)]" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-[var(--color-primary-900)]">
                {displayDate} 출석 투표가 필요합니다
              </h3>
              {timeLeft && (
                <p className="mt-1 text-sm text-[var(--color-primary-700)]">
                  마감: {voteDeadlineDisplay} ({timeLeft})
                </p>
              )}
              <Button asChild size="sm" className="mt-3">
                <Link href="/attendances">지금 투표하기</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 투표 완료
  if (timeContext === 'VOTE_COMPLETED') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-green-900">
                {displayDate} 출석 투표 완료!
              </h3>
              <p className="mt-1 text-sm text-green-700">
                {isAvailable ? '출석 예정' : '불참 예정'}으로 등록되었습니다.
                {voteDeadlineDisplay && ` (마감: ${voteDeadlineDisplay})`}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/attendances">투표 수정</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 투표 마감됨
  if (timeContext === 'VOTE_CLOSED') {
    return (
      <Card className="border-[var(--color-border-default)] bg-[var(--color-background-secondary)]">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[var(--color-background-tertiary)] p-2">
              <Clock className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-[var(--color-text-primary)]">
                {displayDate} 출석 투표 마감
              </h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {hasVoted
                  ? isAvailable
                    ? '출석 예정으로 등록되었습니다.'
                    : '불참 예정으로 등록되었습니다.'
                  : '투표하지 않았습니다.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 배치표 확인/주일 당일 - 투표 관련 카드 숨김
  return null;
}

export default VoteActionCard;
