'use client';

import { format, isToday } from 'date-fns';
import { Users } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDisplayDate } from '@/lib/dashboard-context';
import type { AttendanceSummaryItem } from '@/app/api/dashboard/conductor-status/route';

interface AttendanceSummaryCardProps {
  nextServiceDate: string;
  summaries: AttendanceSummaryItem[];
}

/** 파트별 마지막 저장 시각 표시 — 당일이면 HH:mm, 그 외에는 M/d HH:mm */
function formatLastUpdated(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return isToday(d) ? format(d, 'HH:mm') : format(d, 'M/d HH:mm');
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

/** 개별 예배 출석 요약 섹션 */
function ServiceAttendanceSection({
  summary,
  showLabel,
  nextServiceDate,
}: {
  summary: AttendanceSummaryItem;
  showLabel: boolean;
  nextServiceDate: string;
}) {
  const { availableCount, unavailableCount, byPart, serviceType } = summary;

  return (
    <div className="space-y-3">
      {showLabel && (
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-[var(--color-border-subtle)]" />
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
            {serviceType}
          </span>
          <div className="h-px flex-1 bg-[var(--color-border-subtle)]" />
        </div>
      )}

      {/* 전체 요약 */}
      <div className="rounded-lg bg-[var(--color-background-tertiary)] p-4">
        {!showLabel && (
          <div className="text-sm text-[var(--color-text-secondary)]">
            {formatDisplayDate(nextServiceDate)} 기준
          </div>
        )}
        {showLabel && (
          <div className="text-sm text-[var(--color-text-secondary)]">
            {formatDisplayDate(nextServiceDate)} 기준
          </div>
        )}
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
          .filter((p) => PART_LABELS[p.part])
          .map((part) => {
            const colors = PART_CARD_COLORS[part.part];
            return (
              <div
                key={part.part}
                className={`rounded-md border p-2 text-center ${colors?.bg ?? ''} ${colors?.border ?? 'border-[var(--color-border-subtle)]'}`}
              >
                <div className={`text-xs font-semibold ${colors?.label ?? 'text-[var(--color-text-tertiary)]'}`}>
                  {PART_LABELS[part.part]}
                </div>
                <div className={`mt-1 text-lg font-semibold ${colors?.count ?? 'text-[var(--color-text-primary)]'}`}>
                  {part.available}
                  <span className="text-sm font-normal text-[var(--color-text-tertiary)]">
                    /{part.total}
                  </span>
                </div>
                <div
                  className="mt-1 text-[10px] leading-tight text-[var(--color-text-tertiary)]"
                  title={part.lastUpdatedAt ?? '저장 이력 없음'}
                >
                  {formatLastUpdated(part.lastUpdatedAt)}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/**
 * 출석 현황 요약 카드 (지휘자용)
 *
 * 다음 주일 출석 현황을 예배별, 파트별로 요약합니다.
 * 같은 날에 여러 예배가 있으면 각각 독립적으로 표시합니다.
 */
export function AttendanceSummaryCard({ nextServiceDate, summaries }: AttendanceSummaryCardProps) {
  const showLabels = summaries.length > 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-[var(--color-primary-500)]" />
          이번 주 출석 현황
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaries.map((summary, index) => (
          <ServiceAttendanceSection
            key={summary.serviceScheduleId ?? index}
            summary={summary}
            showLabel={showLabels}
            nextServiceDate={nextServiceDate}
          />
        ))}

        {/* 액션 버튼 */}
        <Button asChild variant="outline" className="w-full">
          <Link href="/attendances">출석 관리</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default AttendanceSummaryCard;
