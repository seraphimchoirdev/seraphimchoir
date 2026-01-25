'use client';

import { UserX } from 'lucide-react';

import { Switch } from '@/components/ui/switch';

interface AttendanceFiltersProps {
  showAbsentOnly: boolean;
  onShowAbsentOnlyChange: (value: boolean) => void;
  absentCount: number;
}

export default function AttendanceFilters({
  showAbsentOnly,
  onShowAbsentOnlyChange,
  absentCount,
}: AttendanceFiltersProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[var(--color-background-secondary)] px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        <UserX className="h-4 w-4 text-[var(--color-text-tertiary)]" />
        <span className="text-[var(--color-text-secondary)]">불참자만 보기</span>
        {showAbsentOnly && absentCount > 0 && (
          <span className="rounded bg-[var(--color-error-100)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-error-700)]">
            {absentCount}명
          </span>
        )}
      </div>
      <Switch checked={showAbsentOnly} onCheckedChange={onShowAbsentOnlyChange} variant="default" />
    </div>
  );
}
