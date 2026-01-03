/**
 * AttendanceStatistics.tsx
 * 출석 통계 대시보드 컴포넌트 (RPC 함수 및 차트 연동)
 */

'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns/format';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { subMonths } from 'date-fns/subMonths';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { startOfYear } from 'date-fns/startOfYear';
import { Users, UserCheck, UserX, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import {
  useAttendanceStatistics,
  usePartAttendanceStatistics,
  useAttendanceSummaryByDate,
} from '@/hooks/useAttendanceStatistics';
import AttendanceStatsCard from './AttendanceStatsCard';

// 차트 컴포넌트 동적 임포트 (recharts 368K 번들 분리)
const DonutChart = dynamic(
  () => import('./AttendanceChart').then(mod => ({ default: mod.DonutChart })),
  {
    loading: () => <div className="h-[300px] bg-gray-100 animate-pulse rounded-lg" />,
    ssr: false
  }
);

const PartBarChart = dynamic(
  () => import('./AttendanceChart').then(mod => ({ default: mod.PartBarChart })),
  {
    loading: () => <div className="h-[300px] bg-gray-100 animate-pulse rounded-lg" />,
    ssr: false
  }
);

const TrendLineChart = dynamic(
  () => import('./AttendanceChart').then(mod => ({ default: mod.TrendLineChart })),
  {
    loading: () => <div className="h-[300px] bg-gray-100 animate-pulse rounded-lg" />,
    ssr: false
  }
);

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PART_COLORS = {
  SOPRANO: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    bar: 'bg-purple-500',
  },
  ALTO: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    bar: 'bg-yellow-500',
  },
  TENOR: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    bar: 'bg-blue-500',
  },
  BASS: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    bar: 'bg-green-500',
  },
  SPECIAL: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    bar: 'bg-amber-500',
  },
} as const;

type Part = keyof typeof PART_COLORS;

type DateRangePreset = 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

/**
 * 출석 통계 대시보드
 * - RPC 함수를 통한 서버 계산 통계
 * - Recharts를 통한 시각화
 * - 날짜 범위 필터링 및 빠른 선택
 */
export default function AttendanceStatistics() {
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedPart, setSelectedPart] = useState<Part | 'ALL'>('ALL');

  // 날짜 범위 계산
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();

    switch (dateRangePreset) {
      case 'this_week':
        return {
          startDate: format(startOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
          endDate: format(endOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        };
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
      case 'custom':
        return {
          startDate: customStartDate || format(startOfMonth(today), 'yyyy-MM-dd'),
          endDate: customEndDate || format(endOfMonth(today), 'yyyy-MM-dd'),
        };
      default:
        return {
          startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
        };
    }
  }, [dateRangePreset, customStartDate, customEndDate]);

  // RPC 훅 사용
  const {
    data: overallStats,
    isLoading: overallLoading,
    error: overallError,
  } = useAttendanceStatistics(startDate, endDate);

  const {
    data: partStats,
    isLoading: partLoading,
    error: partError,
  } = usePartAttendanceStatistics(startDate, endDate);

  const {
    data: dailySummary,
    isLoading: dailyLoading,
    error: dailyError,
  } = useAttendanceSummaryByDate(startDate, endDate);

  // 필터링된 파트별 통계
  const filteredPartStats = useMemo(() => {
    if (!partStats) return [];
    if (selectedPart === 'ALL') return partStats;
    return partStats.filter((stat) => stat.part === selectedPart);
  }, [partStats, selectedPart]);

  const isLoading = overallLoading || partLoading || dailyLoading;
  const hasError = overallError || partError || dailyError;

  // 로딩 스켈레톤
  if (isLoading) {
    return (
      <Card className="p-6 shadow-[var(--shadow-sm)] border-none">
        <div className="animate-pulse space-y-6">
          {/* 헤더 스켈레톤 */}
          <div className="flex justify-between items-center">
            <div className="h-6 bg-[var(--color-background-tertiary)] rounded w-48"></div>
            <div className="h-10 bg-[var(--color-background-tertiary)] rounded w-64"></div>
          </div>

          {/* KPI 카드 스켈레톤 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[var(--color-background-tertiary)] rounded-[var(--radius-lg)]"></div>
            ))}
          </div>

          {/* 차트 스켈레톤 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-[var(--color-background-tertiary)] rounded-[var(--radius-lg)]"></div>
            <div className="h-80 bg-[var(--color-background-tertiary)] rounded-[var(--radius-lg)]"></div>
          </div>
        </div>
      </Card>
    );
  }

  // 에러 처리
  if (hasError) {
    return (
      <Card className="p-6 shadow-[var(--shadow-sm)] border-none">
        <div className="text-center py-12">
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
          <h3 className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">통계 조회 실패</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {overallError?.message || partError?.message || dailyError?.message}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            다시 시도
          </Button>
        </div>
      </Card>
    );
  }

  // 데이터 없음 처리
  const hasData = overallStats && overallStats.total_records > 0;

  return (
    <Card className="p-6 shadow-[var(--shadow-sm)] border-none bg-[var(--color-surface)]">
      {/* 헤더 및 필터 */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="heading-3 text-[var(--color-text-primary)] flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[var(--color-primary-600)]" />
            출석 통계 대시보드
          </h2>

          {/* 날짜 범위 빠른 선택 */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 'this_week', label: '이번 주' },
              { value: 'this_month', label: '이번 달' },
              { value: 'last_month', label: '지난 달' },
              { value: 'this_year', label: '올해' },
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
          <div className="flex flex-wrap items-center gap-3 p-4 bg-[var(--color-background-tertiary)] rounded-[var(--radius-lg)]">
            <Calendar className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            <div className="flex items-center gap-2">
              <Label className="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">시작일:</Label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <span className="text-[var(--color-text-tertiary)]">~</span>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">종료일:</Label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        )}

        {/* 선택된 기간 표시 */}
        <div className="text-sm text-[var(--color-text-secondary)]">
          기간: {startDate} ~ {endDate}
        </div>
      </div>

      {/* KPI 카드 */}
      {overallStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <AttendanceStatsCard
            title="총 출석 기록"
            value={overallStats.total_records}
            unit="건"
            icon={Users}
            bgColor="bg-[var(--color-background-tertiary)]"
            textColor="text-[var(--color-text-primary)]"
            iconColor="text-[var(--color-text-secondary)]"
          />
          <AttendanceStatsCard
            title="출석"
            value={overallStats.available_count}
            unit="건"
            icon={UserCheck}
            bgColor="bg-[var(--color-success-50)]"
            textColor="text-[var(--color-success-700)]"
            iconColor="text-[var(--color-success-600)]"
          />
          <AttendanceStatsCard
            title="불참"
            value={overallStats.unavailable_count}
            unit="건"
            icon={UserX}
            bgColor="bg-[var(--color-error-50)]"
            textColor="text-[var(--color-error-700)]"
            iconColor="text-[var(--color-error-600)]"
          />
          <AttendanceStatsCard
            title="전체 출석률"
            value={overallStats.attendance_rate.toFixed(1)}
            unit="%"
            icon={TrendingUp}
            bgColor="bg-[var(--color-primary-50)]"
            textColor="text-[var(--color-primary-700)]"
            iconColor="text-[var(--color-primary-600)]"
          />
        </div>
      )}

      {!hasData ? (
        /* 데이터 없음 메시지 */
        <div className="text-center py-12">
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
          <h3 className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">출석 데이터 없음</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            선택한 기간에 등록된 출석 기록이 없습니다.
          </p>
        </div>
      ) : (
        <>
          {/* 차트 영역 */}
          <div className="space-y-8">
            {/* 도넛 차트 & 파트별 막대 그래프 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 전체 출석률 도넛 차트 */}
              {overallStats && (
                <div className="bg-[var(--color-background-tertiary)] rounded-[var(--radius-lg)] p-6">
                  <h3 className="text-md font-semibold text-[var(--color-text-primary)] mb-4">
                    전체 출석 현황
                  </h3>
                  <DonutChart data={overallStats} />
                </div>
              )}

              {/* 파트별 출석률 막대 그래프 */}
              {partStats && partStats.length > 0 && (
                <div className="bg-[var(--color-background-tertiary)] rounded-[var(--radius-lg)] p-6">
                  <h3 className="text-md font-semibold text-[var(--color-text-primary)] mb-4">
                    파트별 출석률 비교
                  </h3>
                  <PartBarChart data={partStats} />
                </div>
              )}
            </div>

            {/* 날짜별 추세 라인 차트 */}
            {dailySummary && dailySummary.length > 0 && (
              <div className="bg-[var(--color-background-tertiary)] rounded-[var(--radius-lg)] p-6">
                <h3 className="text-md font-semibold text-[var(--color-text-primary)] mb-4">
                  날짜별 출석률 추세
                </h3>
                <TrendLineChart data={dailySummary} />
              </div>
            )}

            {/* 파트별 상세 통계 테이블 */}
            {partStats && partStats.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-semibold text-[var(--color-text-primary)]">파트별 상세 통계</h3>

                  {/* 파트 필터 */}
                  <select
                    value={selectedPart}
                    onChange={(e) => setSelectedPart(e.target.value as Part | 'ALL')}
                    className="h-9 rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-background-primary)] px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]"
                  >
                    <option value="ALL">전체 파트</option>
                    <option value="SOPRANO">SOPRANO</option>
                    <option value="ALTO">ALTO</option>
                    <option value="TENOR">TENOR</option>
                    <option value="BASS">BASS</option>
                    <option value="SPECIAL">SPECIAL</option>
                  </select>
                </div>

                <div className="space-y-4">
                  {filteredPartStats.map((stat) => {
                    const colors = PART_COLORS[stat.part];

                    return (
                      <div
                        key={stat.part}
                        className={`border ${colors.border} ${colors.bg} rounded-[var(--radius-lg)] p-4`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold ${colors.text}`}>
                              {stat.part}
                            </span>
                            <span className="text-sm text-[var(--color-text-secondary)]">
                              총 {stat.total_count}건
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${colors.text}`}>
                              {stat.attendance_rate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-[var(--color-text-secondary)]">출석률</div>
                          </div>
                        </div>

                        {/* 출석률 바 */}
                        <div className="w-full bg-[var(--color-background-tertiary)] rounded-full h-3 mb-2">
                          <div
                            className={`${colors.bar} h-3 rounded-full transition-all duration-300`}
                            style={{ width: `${stat.attendance_rate}%` }}
                          ></div>
                        </div>

                        {/* 상세 수치 */}
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--color-success-600)]">출석: {stat.available_count}건</span>
                          <span className="text-[var(--color-error-600)]">불참: {stat.unavailable_count}건</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
