'use client';

import { FileUp, Loader2, Plus, Save, Trash2 } from 'lucide-react';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  useBulkUpsertPrayers,
  usePrayerAssignments,
  type PrayerAssignmentInput,
} from '@/hooks/usePrayerAssignments';

import { showError, showSuccess } from '@/lib/toast';

import PrayerImportDialog from './PrayerImportDialog';

const PARTS = ['소프라노', '알토', '테너', '베이스'] as const;

// 가운 파트 자동 순환 기준점: 2025-01-05(일) = 소프라노 (index 0)
const GOWN_ROTATION_BASE_DATE = '2025-01-05';

/**
 * 기준점(2025-01-05 소프라노)으로부터 주 수를 세어
 * 소프라노→알토→테너→베이스 순환 파트를 계산
 */
function getRotationPart(dateStr: string): string {
  const base = new Date(GOWN_ROTATION_BASE_DATE + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');
  const diffWeeks = Math.round((target.getTime() - base.getTime()) / (7 * 24 * 60 * 60 * 1000));
  // 양수/음수 모두 올바르게 순환하도록 modulo 처리
  const index = ((diffWeeks % PARTS.length) + PARTS.length) % PARTS.length;
  return PARTS[index];
}

interface LocalRow extends PrayerAssignmentInput {
  _key: string;
}

/**
 * 분기의 모든 주일 날짜를 생성
 */
function getSundaysInQuarter(year: number, quarter: number): string[] {
  const startMonth = (quarter - 1) * 3;
  const endDate = new Date(year, startMonth + 3, 0); // 분기 마지막 날
  const sundays: string[] = [];

  const current = new Date(year, startMonth, 1);
  // 첫 주일 찾기
  while (current.getDay() !== 0) {
    current.setDate(current.getDate() + 1);
  }

  while (current <= endDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    sundays.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 7);
  }

  return sundays;
}

export default function PrayerAssignmentManager() {
  const now = new Date();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(currentQuarter);

  const quarterStr = `${year}-Q${quarter}`;
  const { data: response, isLoading } = usePrayerAssignments({ quarter: quarterStr });
  const bulkUpsert = useBulkUpsertPrayers();

  const sundays = useMemo(() => getSundaysInQuarter(year, quarter), [year, quarter]);

  const [rows, setRows] = useState<LocalRow[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // DB 데이터로 초기화
  useEffect(() => {
    if (!response?.data) return;

    const existingMap = new Map(response.data.map(a => [a.date, a]));
    const sundaySet = new Set(sundays);

    // 주일 날짜로 기본 행 생성
    const newRows: LocalRow[] = sundays.map(date => {
      const existing = existingMap.get(date);
      return {
        _key: date,
        date,
        prayer_names: existing?.prayer_names || '',
        gown_part: existing?.gown_part || getRotationPart(date),
        quarter: quarterStr,
      };
    });

    // DB에 저장된 비주일 날짜도 추가 (기도자가 입력된 항목만)
    for (const a of response.data) {
      if (!sundaySet.has(a.date) && a.prayer_names) {
        newRows.push({
          _key: a.date,
          date: a.date,
          prayer_names: a.prayer_names,
          gown_part: a.gown_part || '',
          quarter: quarterStr,
        });
      }
    }

    newRows.sort((a, b) => a.date.localeCompare(b.date));
    setRows(newRows);
    setIsDirty(false);
  }, [response?.data, sundays, quarterStr]);

  const updateRow = useCallback((key: string, field: keyof PrayerAssignmentInput, value: string) => {
    setRows(prev => prev.map(r =>
      r._key === key ? { ...r, [field]: value } : r
    ));
    setIsDirty(true);
  }, []);

  const addCustomDate = useCallback(() => {
    const dateStr = prompt('추가할 날짜를 입력하세요 (YYYY-MM-DD):');
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
    if (rows.some(r => r.date === dateStr)) {
      showError('이미 존재하는 날짜입니다.');
      return;
    }
    setRows(prev => [...prev, {
      _key: dateStr,
      date: dateStr,
      prayer_names: '',
      gown_part: new Date(dateStr + 'T00:00:00').getDay() === 0 ? getRotationPart(dateStr) : '',
      quarter: quarterStr,
    }].sort((a, b) => a.date.localeCompare(b.date)));
    setIsDirty(true);
  }, [rows, quarterStr]);

  const removeRow = useCallback((key: string) => {
    setRows(prev => prev.filter(r => r._key !== key));
    setIsDirty(true);
  }, []);

  const handleImport = useCallback((imported: Array<{ date: string; prayer_names: string; gown_part: string }>) => {
    setRows(prev => {
      const rowMap = new Map(prev.map(r => [r.date, r]));
      for (const item of imported) {
        const existing = rowMap.get(item.date);
        if (existing) {
          // 기존 행 덮어쓰기
          rowMap.set(item.date, {
            ...existing,
            prayer_names: item.prayer_names || existing.prayer_names,
            gown_part: item.gown_part || existing.gown_part,
          });
        } else {
          // 새 행 추가
          rowMap.set(item.date, {
            _key: item.date,
            date: item.date,
            prayer_names: item.prayer_names,
            gown_part: item.gown_part || (new Date(item.date + 'T00:00:00').getDay() === 0 ? getRotationPart(item.date) : ''),
            quarter: quarterStr,
          });
        }
      }
      return Array.from(rowMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    });
    setIsDirty(true);
  }, [quarterStr]);

  const handleSave = useCallback(async () => {
    const assignments = rows.map(({ _key, ...rest }) => rest);
    try {
      await bulkUpsert.mutateAsync(assignments);
      showSuccess('기도 담당이 저장되었습니다.');
      setIsDirty(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    }
  }, [rows, bulkUpsert]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return `${month}/${day} (${dayNames[d.getDay()]})`;
  };

  return (
    <div className="space-y-6">
      {/* 분기 선택기 */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={year.toString()} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={quarter.toString()} onValueChange={v => setQuarter(Number(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map(q => (
              <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={addCustomDate}>
          <Plus className="mr-1 h-4 w-4" />
          날짜 추가
        </Button>

        <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
          <FileUp className="mr-1 h-4 w-4" />
          파일 가져오기
        </Button>

        <div className="flex-1" />

        <Button
          onClick={handleSave}
          disabled={!isDirty || bulkUpsert.isPending}
          className="bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)]"
        >
          {bulkUpsert.isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          일괄 저장
        </Button>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--color-background-secondary)]">
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">날짜</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">기도자</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)] w-[160px]">가운 파트</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-secondary)] w-[60px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map(row => (
                <tr key={row._key} className="bg-[var(--color-surface)]">
                  <td className="px-4 py-2 text-sm font-medium whitespace-nowrap">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      value={row.prayer_names}
                      onChange={e => updateRow(row._key, 'prayer_names', e.target.value)}
                      placeholder="예: 김택훈/문승현"
                      className="h-9"
                    />
                  </td>
                  <td className="px-4 py-2">
                    {sundays.includes(row.date) ? (
                      <Select
                        value={row.gown_part}
                        onValueChange={v => updateRow(row._key, 'gown_part', v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="파트 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {PARTS.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="inline-block h-9 px-3 py-2 text-sm text-[var(--color-text-tertiary)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {!sundays.includes(row.date) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(row._key)}
                        className="text-[var(--color-error-600)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
              해당 분기에 주일 날짜가 없습니다.
            </p>
          )}
        </div>
      )}

      <PrayerImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        year={year}
        quarter={quarterStr}
        onImport={handleImport}
      />
    </div>
  );
}
