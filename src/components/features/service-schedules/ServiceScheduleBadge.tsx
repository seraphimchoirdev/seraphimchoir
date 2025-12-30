'use client';

import { Music } from 'lucide-react';
import { useServiceScheduleByDate } from '@/hooks/useServiceSchedules';
import { Spinner } from '@/components/ui/spinner';

interface ServiceScheduleBadgeProps {
  date: string;
  compact?: boolean;
}

/**
 * arrangements 페이지에서 예배 일정 정보를 표시하는 작은 배지
 */
export default function ServiceScheduleBadge({
  date,
  compact = false,
}: ServiceScheduleBadgeProps) {
  const { data: schedule, isLoading } = useServiceScheduleByDate(date);

  if (isLoading) {
    return <Spinner className="h-3 w-3" />;
  }

  if (!schedule) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="text-[var(--color-text-secondary)]">
          {schedule.service_type || '주일예배'}
        </span>
        {schedule.hymn_name && (
          <>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1 text-[var(--color-primary-600)]">
              <Music className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{schedule.hymn_name}</span>
            </span>
          </>
        )}
        {schedule.offertory_performer && (
          <>
            <span className="text-gray-300">•</span>
            <span className="text-[var(--color-text-tertiary)]">
              봉헌: {schedule.offertory_performer}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 text-xs">
      <span className="text-[var(--color-text-secondary)]">
        {schedule.service_type || '주일예배'}
      </span>
      {schedule.hymn_name && (
        <span className="flex items-center gap-1 text-[var(--color-primary-600)]">
          <Music className="h-3 w-3" />
          {schedule.hymn_name}
        </span>
      )}
      {schedule.offertory_performer && (
        <span className="text-[var(--color-text-tertiary)]">
          봉헌: {schedule.offertory_performer}
        </span>
      )}
    </div>
  );
}
