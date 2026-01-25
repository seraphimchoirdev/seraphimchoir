'use client';

import { Part } from '@/types';

import { getPartAbbreviation } from '@/lib/utils';

interface PartStat {
  part: Part;
  total: number;
  attending: number;
}

interface AttendanceSummaryProps {
  totalCount: number;
  attendingCount: number;
  partStats: PartStat[];
}

export default function AttendanceSummary({
  totalCount,
  attendingCount,
  partStats,
}: AttendanceSummaryProps) {
  const percentage = totalCount > 0 ? Math.round((attendingCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3 rounded-lg border border-[var(--color-border-default)] bg-white p-4">
      {/* 메인 통계 */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-[var(--color-text-primary)]">
          출석: {attendingCount}명 / {totalCount}명
        </span>
        <span
          className={`text-lg font-bold ${
            percentage >= 80
              ? 'text-[var(--color-success-600)]'
              : percentage >= 50
                ? 'text-[var(--color-warning-600)]'
                : 'text-[var(--color-error-600)]'
          }`}
        >
          {percentage}%
        </span>
      </div>

      {/* 프로그레스 바 */}
      <div className="h-3 overflow-hidden rounded-full bg-[var(--color-background-tertiary)]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            percentage >= 80
              ? 'bg-[var(--color-success-400)]'
              : percentage >= 50
                ? 'bg-[var(--color-warning-400)]'
                : 'bg-[var(--color-error-400)]'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* 파트별 요약 */}
      <div className="flex flex-wrap gap-3 text-sm text-[var(--color-text-secondary)]">
        {partStats.map((stat) => (
          <span key={stat.part} className="whitespace-nowrap">
            <span className="font-medium">{getPartAbbreviation(stat.part)}</span>
            <span className="text-[var(--color-text-tertiary)]">:</span>
            <span
              className={stat.attending === stat.total ? 'text-[var(--color-success-600)]' : ''}
            >
              {stat.attending}/{stat.total}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
