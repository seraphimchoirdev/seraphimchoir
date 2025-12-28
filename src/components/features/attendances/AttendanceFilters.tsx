'use client';

import { Switch } from '@/components/ui/switch';
import { UserX } from 'lucide-react';

interface AttendanceFiltersProps {
  showAbsentOnly: boolean;
  onShowAbsentOnlyChange: (value: boolean) => void;
  absentCount: number;
}

export default function AttendanceFilters({
  showAbsentOnly,
  onShowAbsentOnlyChange,
  absentCount
}: AttendanceFiltersProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-[var(--color-background-secondary)] rounded-lg">
      <div className="flex items-center gap-2 text-sm">
        <UserX className="w-4 h-4 text-[var(--color-text-tertiary)]" />
        <span className="text-[var(--color-text-secondary)]">
          불참자만 보기
        </span>
        {showAbsentOnly && absentCount > 0 && (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-[var(--color-error-100)] text-[var(--color-error-700)] rounded">
            {absentCount}명
          </span>
        )}
      </div>
      <Switch
        checked={showAbsentOnly}
        onCheckedChange={onShowAbsentOnlyChange}
        variant="default"
      />
    </div>
  );
}
