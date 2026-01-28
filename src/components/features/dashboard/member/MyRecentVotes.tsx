'use client';

import { Check, History, X } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDisplayDate } from '@/lib/dashboard-context';

interface RecentVote {
  date: string;
  isAvailable: boolean;
  notes: string | null;
}

interface MyRecentVotesProps {
  votes: RecentVote[];
}

/**
 * 내 최근 출석 이력 카드
 *
 * 최근 투표 이력을 표시합니다.
 */
export function MyRecentVotes({ votes }: MyRecentVotesProps) {
  if (votes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          내 최근 출석
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {votes.map((vote) => (
            <li
              key={vote.date}
              className="flex items-center justify-between rounded-md bg-[var(--color-background-tertiary)] px-3 py-2"
            >
              <span className="text-sm text-[var(--color-text-secondary)]">
                {formatDisplayDate(vote.date)}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-sm font-medium ${
                  vote.isAvailable ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {vote.isAvailable ? (
                  <>
                    <Check className="h-4 w-4" />
                    출석
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    불참
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default MyRecentVotes;
