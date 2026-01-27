'use client';

import { Bell, Users } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDisplayDate } from '@/lib/dashboard-context';

interface PartSummary {
  part: string;
  total: number;
  available: number;
  unavailable: number;
  noResponse: number;
}

interface AttendanceSummaryCardProps {
  nextServiceDate: string;
  summary: {
    totalMembers: number;
    availableCount: number;
    unavailableCount: number;
    noResponseCount: number;
    byPart: PartSummary[];
  };
}

const PART_LABELS: Record<string, string> = {
  SOPRANO: 'S',
  ALTO: 'A',
  TENOR: 'T',
  BASS: 'B',
};

/**
 * 출석 현황 요약 카드 (지휘자용)
 *
 * 다음 주일 출석 현황을 파트별로 요약합니다.
 */
export function AttendanceSummaryCard({ nextServiceDate, summary }: AttendanceSummaryCardProps) {
  const { totalMembers, availableCount, unavailableCount, noResponseCount, byPart } = summary;

  // 출석률 계산
  const responseCount = availableCount + unavailableCount;
  const attendanceRate =
    responseCount > 0 ? Math.round((availableCount / responseCount) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-[var(--color-primary-500)]" />
          이번 주 출석 현황
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 전체 요약 */}
        <div className="rounded-lg bg-[var(--color-background-tertiary)] p-4">
          <div className="text-sm text-[var(--color-text-secondary)]">
            {formatDisplayDate(nextServiceDate)} 기준
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-primary-600)]">
              {availableCount}명
            </span>
            <span className="text-sm text-[var(--color-text-secondary)]">출석 가능</span>
          </div>

          {/* 상세 통계 */}
          <div className="mt-3 flex gap-4 text-sm">
            <div>
              <span className="text-[var(--color-text-tertiary)]">미응답: </span>
              <span
                className={`font-medium ${noResponseCount > 0 ? 'text-amber-600' : 'text-[var(--color-text-secondary)]'}`}
              >
                {noResponseCount}명
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">불참: </span>
              <span className="font-medium text-[var(--color-text-secondary)]">
                {unavailableCount}명
              </span>
            </div>
          </div>
        </div>

        {/* 파트별 현황 */}
        <div className="grid grid-cols-4 gap-2">
          {byPart
            .filter((p) => PART_LABELS[p.part]) // SPECIAL 제외
            .map((part) => (
              <div
                key={part.part}
                className="rounded-md border border-[var(--color-border-subtle)] p-2 text-center"
              >
                <div className="text-xs font-medium text-[var(--color-text-tertiary)]">
                  {PART_LABELS[part.part]}
                </div>
                <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                  {part.available}
                  <span className="text-sm font-normal text-[var(--color-text-tertiary)]">
                    /{part.total}
                  </span>
                </div>
              </div>
            ))}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/attendances">출석 관리</Link>
          </Button>
          {noResponseCount > 0 && (
            <Button variant="outline" size="icon" title="미응답자 알림 보내기">
              <Bell className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AttendanceSummaryCard;
