'use client';

import { Check, Loader2, Search } from 'lucide-react';

import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Input } from '@/components/ui/input';
import { PART_LABELS, SELECTABLE_PARTS } from '@/lib/community/poll-constants';
import { STALE_TIME } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface MemberOption {
  id: string;
  name: string;
  part: string;
  member_status: string;
}

interface MemberMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * 대원 개인별 다중 선택 (파트별 그룹 + 이름 검색 + 체크 토글)
 * 활성 대원(REGULAR/NEW)만 표시한다.
 */
export function MemberMultiSelect({ selectedIds, onChange }: MemberMultiSelectProps) {
  const [search, setSearch] = useState('');

  const { data: members, isLoading } = useQuery<MemberOption[]>({
    queryKey: ['members-for-notify'],
    queryFn: async () => {
      const res = await fetch('/api/members?limit=100');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '대원 목록을 불러오는데 실패했습니다.');
      }
      const json = await res.json();
      return (json.data as MemberOption[]).filter((m) =>
        ['REGULAR', 'NEW'].includes(m.member_status)
      );
    },
    staleTime: STALE_TIME.LONG,
  });

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredByPart = useMemo(() => {
    const keyword = search.trim();
    const filtered = (members ?? []).filter((m) => !keyword || m.name.includes(keyword));
    const groups = new Map<string, MemberOption[]>();
    for (const part of SELECTABLE_PARTS) groups.set(part, []);
    for (const m of filtered) {
      const list = groups.get(m.part);
      if (list) list.push(m);
      else groups.set(m.part, [m]);
    }
    return [...groups.entries()].filter(([, list]) => list.length > 0);
  }, [members, search]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center rounded-lg border border-[var(--color-border-default)] py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-tertiary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-[var(--color-border-default)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 검색"
            className="pl-8"
          />
        </div>
        <span className="shrink-0 text-sm text-[var(--color-text-secondary)]">
          {selected.size}명 선택
        </span>
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto pt-1">
        {filteredByPart.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--color-text-tertiary)]">
            검색 결과가 없습니다
          </p>
        )}
        {filteredByPart.map(([part, list]) => (
          <div key={part}>
            <div className="mb-1.5 text-xs font-semibold text-[var(--color-text-tertiary)]">
              {PART_LABELS[part] || part}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {list.map((m) => {
                const isSelected = selected.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      isSelected
                        ? 'border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white'
                        : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]'
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MemberMultiSelect;
