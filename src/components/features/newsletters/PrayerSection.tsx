'use client';

import { Loader2, Pencil } from 'lucide-react';
import { useRef, useState } from 'react';

import { usePrayerAssignments, useUpdatePrayer } from '@/hooks/usePrayerAssignments';
import { showError, showSuccess } from '@/lib/toast';

interface PrayerSectionProps {
  issueDate: string;
  editable?: boolean;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getNextSunday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function PrayerSection({ issueDate, editable = false }: PrayerSectionProps) {
  const nextSunday = getNextSunday(issueDate);

  const { data: response, isLoading } = usePrayerAssignments({
    startDate: issueDate,
    endDate: nextSunday,
  });

  const updatePrayer = useUpdatePrayer();

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (date: string, currentValue: string) => {
    if (!editable) return;
    setEditingDate(date);
    setEditValue(currentValue);
    setOriginalValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingDate(null);
    setEditValue('');
    setOriginalValue('');
  };

  const saveEdit = async (assignmentId: string) => {
    const trimmed = editValue.trim();
    if (trimmed === originalValue) {
      cancelEdit();
      return;
    }

    try {
      await updatePrayer.mutateAsync({
        id: assignmentId,
        data: { prayer_names: trimmed },
      });
      showSuccess('기도 담당이 수정되었습니다.');
      setEditingDate(null);
    } catch {
      showError('수정에 실패했습니다.');
      setEditValue(originalValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, assignmentId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(assignmentId);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const thisWeek = response?.data?.find(a => a.date === issueDate);
  const nextWeek = response?.data?.find(a => a.date === nextSunday);

  const renderPrayerCell = (
    assignment: typeof thisWeek,
    date: string,
  ) => {
    const isEditing = editingDate === date;
    const value = assignment?.prayer_names || '-';

    if (isEditing && assignment) {
      return (
        <td className="px-2 sm:px-4 py-1.5">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveEdit(assignment.id)}
            onKeyDown={(e) => handleKeyDown(e, assignment.id)}
            autoFocus
            disabled={updatePrayer.isPending}
            className="w-full rounded border border-[var(--color-primary-300)] bg-white px-2 py-1 text-sm
              focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]
              disabled:opacity-50"
          />
        </td>
      );
    }

    if (editable && assignment) {
      return (
        <td
          className="group/cell cursor-pointer px-2 sm:px-4 py-2 transition-colors hover:bg-[var(--color-primary-50)]"
          onClick={() => startEdit(date, assignment.prayer_names || '')}
          title="클릭하여 수정"
        >
          <span className="inline-flex items-center gap-1">
            {value}
            <Pencil className="h-3 w-3 text-[var(--color-text-tertiary)] opacity-0 transition-opacity group-hover/cell:opacity-100" />
          </span>
        </td>
      );
    }

    return <td className="px-2 sm:px-4 py-2">{value}</td>;
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
        기도 및 가운 봉사 담당
      </h2>

      <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-primary-50)]">
              <th className="px-2 sm:px-4 py-2 text-left font-medium text-[var(--color-primary-700)]">일자</th>
              <th className="px-2 sm:px-4 py-2 text-left font-medium text-[var(--color-primary-700)]">기도</th>
              <th className="px-2 sm:px-4 py-2 text-left font-medium text-[var(--color-primary-700)]">가운 파트</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            <tr>
              <td className="px-2 sm:px-4 py-2 font-medium">{formatShortDate(issueDate)}</td>
              {renderPrayerCell(thisWeek, issueDate)}
              <td className="px-2 sm:px-4 py-2">{thisWeek?.gown_part || '-'}</td>
            </tr>
            <tr>
              <td className="px-2 sm:px-4 py-2 font-medium">{formatShortDate(nextSunday)}</td>
              {renderPrayerCell(nextWeek, nextSunday)}
              <td className="px-2 sm:px-4 py-2">{nextWeek?.gown_part || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-2 text-sm text-[var(--color-text-secondary)] break-keep">
        <p className="font-medium text-[var(--color-text-primary)]">
          - 다음 주 기도 담당자는 기도를 준비해 주세요.
        </p>

        <div className="space-y-0.5">
          <p className="font-semibold text-[var(--color-text-primary)]">시간을 지켜주세요</p>
          <p>- 등단대원은 오전 7시 30분까지, 제1찬양대실에 모여주세요.</p>
          <p>- 2부 예배 후 오전 10시 30분까지, 제2찬양대실에 모여주세요.</p>
        </div>
      </div>
    </section>
  );
}
