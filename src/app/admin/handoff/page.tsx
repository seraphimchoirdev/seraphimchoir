'use client';

import { useQuery } from '@tanstack/react-query';
import { Calendar, FileText, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import Link from 'next/link';

export default function HandoffListPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: files, isLoading } = useQuery({
    queryKey: ['handoff', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/admin/handoff');
      if (!res.ok) throw new Error('Failed to fetch handoff list');
      return res.json() as Promise<string[]>;
    },
  });

  // 검색 필터링
  const filteredFiles = useMemo(() => {
    if (!files) return [];
    if (!searchQuery.trim()) return files;
    return files.filter((file) => file.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);

  // 월별 그룹화
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, string[]> = {};
    filteredFiles.forEach((file) => {
      const date = file.replace('.md', '');
      const month = date.substring(0, 7); // YYYY-MM
      if (!groups[month]) groups[month] = [];
      groups[month].push(file);
    });
    return groups;
  }, [filteredFiles]);

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const monthNames = [
      '1월',
      '2월',
      '3월',
      '4월',
      '5월',
      '6월',
      '7월',
      '8월',
      '9월',
      '10월',
      '11월',
      '12월',
    ];
    return `${year}년 ${monthNames[parseInt(m) - 1]}`;
  };

  const formatDate = (filename: string) => {
    const date = filename.replace('.md', '');
    const [, , day] = date.split('-');
    const d = new Date(date);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return {
      day: parseInt(day),
      weekday: weekdays[d.getDay()],
      full: date,
    };
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">핸드오프 문서</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          AI 세션 간 컨텍스트 보존을 위한 핸드오프 문서 목록입니다.
        </p>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="날짜로 검색 (예: 2026-01)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-10 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      {/* 통계 */}
      {files && (
        <div className="mb-6 flex items-center gap-4 rounded-lg bg-[var(--color-primary)]/5 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
            <FileText className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">{files.length}</div>
            <div className="text-sm text-[var(--color-text-secondary)]">총 핸드오프 문서</div>
          </div>
        </div>
      )}

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : filteredFiles.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedByMonth).map(([month, monthFiles]) => (
            <div key={month}>
              {/* 월 헤더 */}
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {formatMonth(month)}
                </h2>
                <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                  {monthFiles.length}개
                </span>
              </div>

              {/* 날짜 그리드 */}
              <div className="grid grid-cols-7 gap-2 sm:grid-cols-10 md:grid-cols-14">
                {monthFiles.map((file) => {
                  const { day, weekday, full } = formatDate(file);
                  const isWeekend = weekday === '토' || weekday === '일';

                  return (
                    <Link
                      key={file}
                      href={`/admin/handoff/${full}`}
                      className={`group relative flex flex-col items-center justify-center rounded-lg border p-3 transition-all hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 hover:shadow-md ${
                        isWeekend
                          ? 'border-[var(--color-border)] bg-[var(--color-background-secondary)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                      }`}
                    >
                      <span
                        className={`text-lg font-bold ${
                          isWeekend
                            ? weekday === '일'
                              ? 'text-red-500'
                              : 'text-blue-500'
                            : 'text-[var(--color-text-primary)]'
                        } group-hover:text-[var(--color-primary)]`}
                      >
                        {day}
                      </span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">{weekday}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)]" />
          <p className="mt-4 text-[var(--color-text-secondary)]">
            {searchQuery ? '검색 결과가 없습니다.' : '핸드오프 문서가 없습니다.'}
          </p>
        </div>
      )}
    </div>
  );
}
