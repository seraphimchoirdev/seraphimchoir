/**
 * StageStatistics.tsx
 * 등단 통계 대시보드 컴포넌트
 * ml_arrangement_history 테이블 기반의 실제 배치 인원 통계
 */

'use client';

import { endOfMonth } from 'date-fns/endOfMonth';
import { endOfYear } from 'date-fns/endOfYear';
import { format } from 'date-fns/format';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfYear } from 'date-fns/startOfYear';
import { subMonths } from 'date-fns/subMonths';
import { subYears } from 'date-fns/subYears';
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useStageStatistics } from '@/hooks/useStageStatistics';

import type { Part } from '@/types/stage-stats.types';

import AttendanceStatsCard from '../attendances/AttendanceStatsCard';

// 파트별 색상 (기존 시스템과 통일)
const PART_COLORS: Record<Part, { bg: string; text: string; bar: string }> = {
  SOPRANO: {
    bg: 'bg-[var(--color-part-soprano-50)]',
    text: 'text-[var(--color-part-soprano-700)]',
    bar: 'bg-[var(--color-part-soprano-500)]',
  },
  ALTO: {
    bg: 'bg-[var(--color-part-alto-50)]',
    text: 'text-[var(--color-part-alto-700)]',
    bar: 'bg-[var(--color-part-alto-500)]',
  },
  TENOR: {
    bg: 'bg-[var(--color-part-tenor-50)]',
    text: 'text-[var(--color-part-tenor-700)]',
    bar: 'bg-[var(--color-part-tenor-500)]',
  },
  BASS: {
    bg: 'bg-[var(--color-part-bass-50)]',
    text: 'text-[var(--color-part-bass-700)]',
    bar: 'bg-[var(--color-part-bass-500)]',
  },
};

const PART_LABELS: Record<Part, string> = {
  SOPRANO: '소프라노',
  ALTO: '알토',
  TENOR: '테너',
  BASS: '베이스',
};

type DateRangePreset = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';

type SortField = 'date' | 'totalMembers';
type SortOrder = 'asc' | 'desc';

/**
 * 등단 통계 대시보드
 */
export default function StageStatistics() {
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this_year');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('전체');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 날짜 범위 계산
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();

    switch (dateRangePreset) {
      case 'this_month':
        return {
          startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
        };
      case 'last_month':
        const lastMonth = subMonths(today, 1);
        return {
          startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
        };
      case 'this_year':
        return {
          startDate: format(startOfYear(today), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case 'last_year':
        const lastYear = subYears(today, 1);
        return {
          startDate: format(startOfYear(lastYear), 'yyyy-MM-dd'),
          endDate: format(endOfYear(lastYear), 'yyyy-MM-dd'),
        };
      case 'custom':
        return {
          startDate: customStartDate || format(startOfYear(today), 'yyyy-MM-dd'),
          endDate: customEndDate || format(today, 'yyyy-MM-dd'),
        };
      default:
        return {
          startDate: format(startOfYear(today), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
    }
  }, [dateRangePreset, customStartDate, customEndDate]);

  // 데이터 조회
  const { data, isLoading, error } = useStageStatistics({
    startDate,
    endDate,
    serviceType: selectedServiceType === '전체' ? undefined : selectedServiceType,
  });

  // 정렬된 일별 통계
  const sortedDailyStats = useMemo(() => {
    const dailyStats = data?.dailyStats ?? [];
    if (dailyStats.length === 0) return [];

    return [...dailyStats].sort((a, b) => {
      if (sortField === 'date') {
        return sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      } else {
        return sortOrder === 'asc'
          ? a.totalMembers - b.totalMembers
          : b.totalMembers - a.totalMembers;
      }
    });
  }, [data?.dailyStats, sortField, sortOrder]);

  // 정렬 토글
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 로딩 스켈레톤
  if (isLoading) {
    return (
      <Card className="border-none p-6 shadow-[var(--shadow-sm)]">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 rounded bg-[var(--color-background-tertiary)]"></div>
            <div className="h-10 w-64 rounded bg-[var(--color-background-tertiary)]"></div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-[var(--radius-lg)] bg-[var(--color-background-tertiary)]"
              ></div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-80 rounded-[var(--radius-lg)] bg-[var(--color-background-tertiary)]"></div>
            <div className="h-80 rounded-[var(--radius-lg)] bg-[var(--color-background-tertiary)]"></div>
          </div>
        </div>
      </Card>
    );
  }

  // 에러 처리
  if (error) {
    return (
      <Card className="border-none p-6 shadow-[var(--shadow-sm)]">
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 text-[var(--color-error-400)]">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">
            통계 조회 실패
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{error.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            다시 시도
          </Button>
        </div>
      </Card>
    );
  }

  const hasData = data && data.summary.totalServices > 0;

  return (
    <Card className="border-none bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
      {/* 헤더 및 필터 */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="heading-3 flex items-center gap-2 text-[var(--color-text-primary)]">
            <BarChart3 className="h-5 w-5 text-[var(--color-primary-600)]" />
            등단 통계 대시보드
          </h2>

          {/* 날짜 범위 선택 */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 'this_month', label: '이번 달' },
              { value: 'last_month', label: '지난 달' },
              { value: 'this_year', label: '올해' },
              { value: 'last_year', label: '작년' },
              { value: 'custom', label: '직접 선택' },
            ].map((preset) => (
              <Button
                key={preset.value}
                variant={dateRangePreset === preset.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRangePreset(preset.value as DateRangePreset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 커스텀 날짜 선택 */}
        {dateRangePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-background-tertiary)] p-4">
            <Calendar className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap text-[var(--color-text-secondary)]">
                시작일:
              </Label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <span className="text-[var(--color-text-tertiary)]">~</span>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap text-[var(--color-text-secondary)]">
                종료일:
              </Label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        )}

        {/* 예배 유형 필터 */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-sm text-[var(--color-text-secondary)]">
            기간: {startDate} ~ {endDate}
          </div>

          {data && data.serviceTypes.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-[var(--color-text-secondary)]">예배 유형:</Label>
              <select
                value={selectedServiceType}
                onChange={(e) => setSelectedServiceType(e.target.value)}
                className="ring-offset-background h-9 rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-background-primary)] px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:outline-none"
              >
                <option value="전체">전체</option>
                {data.serviceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* KPI 카드 */}
      {data && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AttendanceStatsCard
            title="총 예배 횟수"
            value={data.summary.totalServices}
            unit="회"
            icon={Calendar}
            bgColor="bg-[var(--color-background-tertiary)]"
            textColor="text-[var(--color-text-primary)]"
            iconColor="text-[var(--color-text-secondary)]"
          />
          <AttendanceStatsCard
            title="평균 등단 인원"
            value={data.summary.averageMembers}
            unit="명"
            icon={Users}
            bgColor="bg-[var(--color-primary-50)]"
            textColor="text-[var(--color-primary-700)]"
            iconColor="text-[var(--color-primary-600)]"
          />
          <AttendanceStatsCard
            title="최다 등단일"
            value={data.summary.maxCount}
            unit={`명 (${data.summary.maxDate ? format(new Date(data.summary.maxDate), 'M/d') : '-'})`}
            icon={TrendingUp}
            bgColor="bg-[var(--color-success-50)]"
            textColor="text-[var(--color-success-700)]"
            iconColor="text-[var(--color-success-600)]"
          />
          <AttendanceStatsCard
            title="최소 등단일"
            value={data.summary.minCount}
            unit={`명 (${data.summary.minDate ? format(new Date(data.summary.minDate), 'M/d') : '-'})`}
            icon={TrendingDown}
            bgColor="bg-[var(--color-warning-50)]"
            textColor="text-[var(--color-warning-700)]"
            iconColor="text-[var(--color-warning-600)]"
          />
        </div>
      )}

      {!hasData ? (
        <div className="py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">
            등단 데이터 없음
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            선택한 기간에 등록된 배치 기록이 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 파트별 평균 & 월별 추이 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 파트별 평균 인원 */}
            {data && (
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-background-tertiary)] p-6">
                <h3 className="text-md mb-4 font-semibold text-[var(--color-text-primary)]">
                  파트별 평균 인원
                </h3>
                <div className="space-y-4">
                  {(['SOPRANO', 'ALTO', 'TENOR', 'BASS'] as Part[]).map((part) => {
                    const stats = data.partAverages[part];
                    const colors = PART_COLORS[part];
                    const maxAverage = Math.max(
                      ...Object.values(data.partAverages).map((s) => s.average)
                    );
                    const barWidth = maxAverage > 0 ? (stats.average / maxAverage) * 100 : 0;

                    return (
                      <div key={part} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${colors.text}`}>{PART_LABELS[part]}</span>
                          <span className="text-[var(--color-text-secondary)]">
                            {stats.average}명 ({stats.percentage}%)
                          </span>
                        </div>
                        <div className="h-4 w-full rounded-full bg-[var(--color-background-primary)]">
                          <div
                            className={`${colors.bar} h-4 rounded-full transition-all duration-300`}
                            style={{ width: `${barWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 월별 추이 */}
            {data && data.monthlyTrend.length > 0 && (
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-background-tertiary)] p-6">
                <h3 className="text-md mb-4 font-semibold text-[var(--color-text-primary)]">
                  월별 추이
                </h3>
                <div className="max-h-[300px] space-y-3 overflow-y-auto">
                  {data.monthlyTrend.map((month) => {
                    const maxAvg = Math.max(...data.monthlyTrend.map((m) => m.averageMembers));
                    const barWidth = maxAvg > 0 ? (month.averageMembers / maxAvg) * 100 : 0;

                    return (
                      <div key={month.month} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[var(--color-text-primary)]">
                            {month.month.replace('-', '년 ')}월
                          </span>
                          <span className="text-[var(--color-text-secondary)]">
                            {month.serviceCount}회, 평균 {month.averageMembers}명
                          </span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-[var(--color-background-primary)]">
                          <div
                            className="h-3 rounded-full bg-[var(--color-primary-500)] transition-all duration-300"
                            style={{ width: `${barWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 예배별 상세 테이블 */}
          {sortedDailyStats.length > 0 && (
            <div className="rounded-[var(--radius-lg)] bg-[var(--color-background-tertiary)] p-6">
              <h3 className="text-md mb-4 font-semibold text-[var(--color-text-primary)]">
                예배별 상세
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-default)]">
                      <th
                        className="cursor-pointer px-2 py-3 text-left font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        onClick={() => toggleSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          날짜
                          {sortField === 'date' &&
                            (sortOrder === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </th>
                      <th className="px-2 py-3 text-left font-medium text-[var(--color-text-secondary)]">
                        예배 유형
                      </th>
                      <th
                        className="cursor-pointer px-2 py-3 text-center font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        onClick={() => toggleSort('totalMembers')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          총인원
                          {sortField === 'totalMembers' &&
                            (sortOrder === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </th>
                      <th className="px-2 py-3 text-center font-medium text-[var(--color-part-soprano-600)]">
                        S
                      </th>
                      <th className="px-2 py-3 text-center font-medium text-[var(--color-part-alto-600)]">
                        A
                      </th>
                      <th className="px-2 py-3 text-center font-medium text-[var(--color-part-tenor-600)]">
                        T
                      </th>
                      <th className="px-2 py-3 text-center font-medium text-[var(--color-part-bass-600)]">
                        B
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDailyStats.map((stat) => (
                      <tr
                        key={`${stat.date}-${stat.serviceType}`}
                        className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-background-primary)]"
                      >
                        <td className="px-2 py-3 text-[var(--color-text-primary)]">
                          {format(new Date(stat.date), 'yyyy-MM-dd')}
                        </td>
                        <td className="px-2 py-3 text-[var(--color-text-secondary)]">
                          {stat.serviceType || '-'}
                        </td>
                        <td className="px-2 py-3 text-center font-medium text-[var(--color-text-primary)]">
                          {stat.totalMembers}
                        </td>
                        <td className="px-2 py-3 text-center text-[var(--color-part-soprano-600)]">
                          {stat.partBreakdown.SOPRANO || 0}
                        </td>
                        <td className="px-2 py-3 text-center text-[var(--color-part-alto-600)]">
                          {stat.partBreakdown.ALTO || 0}
                        </td>
                        <td className="px-2 py-3 text-center text-[var(--color-part-tenor-600)]">
                          {stat.partBreakdown.TENOR || 0}
                        </td>
                        <td className="px-2 py-3 text-center text-[var(--color-part-bass-600)]">
                          {stat.partBreakdown.BASS || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
