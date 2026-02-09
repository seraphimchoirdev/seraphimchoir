'use client';

import { Check, Users } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  READINESS_PARTS,
  getReadyPartsCount,
  useAttendanceDeadlines,
} from '@/hooks/useAttendanceDeadlines';
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

/** 파트별 색상 매핑 (globals.css의 CSS 변수 활용) */
const PART_CARD_COLORS: Record<string, { bg: string; border: string; label: string; count: string }> = {
  SOPRANO: {
    bg: 'bg-[var(--color-part-soprano-50)]',
    border: 'border-[var(--color-part-soprano-200)]',
    label: 'text-[var(--color-part-soprano-600)]',
    count: 'text-[var(--color-part-soprano-700)]',
  },
  ALTO: {
    bg: 'bg-[var(--color-part-alto-50)]',
    border: 'border-[var(--color-part-alto-200)]',
    label: 'text-[var(--color-part-alto-600)]',
    count: 'text-[var(--color-part-alto-700)]',
  },
  TENOR: {
    bg: 'bg-[var(--color-part-tenor-50)]',
    border: 'border-[var(--color-part-tenor-200)]',
    label: 'text-[var(--color-part-tenor-600)]',
    count: 'text-[var(--color-part-tenor-700)]',
  },
  BASS: {
    bg: 'bg-[var(--color-part-bass-50)]',
    border: 'border-[var(--color-part-bass-200)]',
    label: 'text-[var(--color-part-bass-600)]',
    count: 'text-[var(--color-part-bass-700)]',
  },
};

/**
 * 출석 현황 요약 카드 (지휘자용)
 *
 * 다음 주일 출석 현황을 파트별로 요약합니다.
 */
export function AttendanceSummaryCard({ nextServiceDate, summary }: AttendanceSummaryCardProps) {
  const { totalMembers, availableCount, unavailableCount, noResponseCount, byPart } = summary;

  // 준비 완료 현황 조회
  const { data: deadlines } = useAttendanceDeadlines(nextServiceDate || undefined);
  const readyCount = getReadyPartsCount(deadlines);
  const totalParts = READINESS_PARTS.length;

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
          <div className="mt-3 text-sm">
            <span className="text-[var(--color-text-tertiary)]">불참: </span>
            <span className="font-medium text-[var(--color-text-secondary)]">
              {unavailableCount}명
            </span>
          </div>
        </div>

        {/* 파트별 현황 */}
        <div className="grid grid-cols-4 gap-2">
          {byPart
            .filter((p) => PART_LABELS[p.part]) // SPECIAL 제외
            .map((part) => {
              const colors = PART_CARD_COLORS[part.part];
              const isReady = deadlines?.partDeadlines?.[part.part as keyof typeof deadlines.partDeadlines] !== null;
              return (
                <div
                  key={part.part}
                  className={`relative rounded-md border p-2 text-center ${colors?.bg ?? ''} ${colors?.border ?? 'border-[var(--color-border-subtle)]'}`}
                >
                  {isReady && (
                    <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-success-500)]">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  <div className={`text-xs font-semibold ${colors?.label ?? 'text-[var(--color-text-tertiary)]'}`}>
                    {PART_LABELS[part.part]}
                  </div>
                  <div className={`mt-1 text-lg font-semibold ${colors?.count ?? 'text-[var(--color-text-primary)]'}`}>
                    {part.available}
                    <span className="text-sm font-normal text-[var(--color-text-tertiary)]">
                      /{part.total}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* 준비 완료 현황 */}
        <div className="flex items-center justify-between rounded-md bg-[var(--color-background-tertiary)] px-3 py-2 text-xs">
          <span className="text-[var(--color-text-secondary)]">파트 준비 현황</span>
          <span className={readyCount === totalParts ? 'font-semibold text-[var(--color-success-600)]' : 'font-medium text-[var(--color-text-tertiary)]'}>
            {readyCount}/{totalParts} 완료
          </span>
        </div>

        {/* 액션 버튼 */}
        <Button asChild variant="outline" className="w-full">
          <Link href="/attendances">출석 관리</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default AttendanceSummaryCard;
