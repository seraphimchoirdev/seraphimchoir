/**
 * 대원별 출석 통계 컴포넌트
 * 각 대원의 출석률을 테이블 형태로 표시합니다.
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
  ArrowUpDown,
  Calendar,
  Filter,
  Medal,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useMemberAttendanceStats } from '@/hooks/useMemberAttendanceStats';

// 파트 색상 정의 (악보 스티커 색상 기준 - 자리배치와 통일)
const PART_COLORS = {
  SOPRANO: {
    bg: 'bg-[var(--color-part-soprano-50)]',
    text: 'text-[var(--color-part-soprano-700)]',
    border: 'border-[var(--color-part-soprano-200)]',
    badge: 'bg-[var(--color-part-soprano-100)] text-[var(--color-part-soprano-700)]',
  },
  ALTO: {
    bg: 'bg-[var(--color-part-alto-50)]',
    text: 'text-[var(--color-part-alto-700)]',
    border: 'border-[var(--color-part-alto-200)]',
    badge: 'bg-[var(--color-part-alto-100)] text-[var(--color-part-alto-700)]',
  },
  TENOR: {
    bg: 'bg-[var(--color-part-tenor-50)]',
    text: 'text-[var(--color-part-tenor-700)]',
    border: 'border-[var(--color-part-tenor-200)]',
    badge: 'bg-[var(--color-part-tenor-100)] text-[var(--color-part-tenor-700)]',
  },
  BASS: {
    bg: 'bg-[var(--color-part-bass-50)]',
    text: 'text-[var(--color-part-bass-700)]',
    border: 'border-[var(--color-part-bass-200)]',
    badge: 'bg-[var(--color-part-bass-100)] text-[var(--color-part-bass-700)]',
  },
  SPECIAL: {
    bg: 'bg-[var(--color-part-special-50)]',
    text: 'text-[var(--color-part-special-700)]',
    border: 'border-[var(--color-part-special-200)]',
    badge: 'bg-[var(--color-part-special-100)] text-[var(--color-part-special-700)]',
  },
} as const;

type Part = keyof typeof PART_COLORS;
type DateRangePreset =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'this_year'
  | 'last_year'
  | 'custom';
type SortBy = 'attendance_rate' | 'name' | 'total_records';
type SortOrder = 'asc' | 'desc';

/**
 * 대원별 출석 통계 컴포넌트
 */
export default function MemberAttendanceStats() {
  // 날짜 범위 설정
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 필터링 & 정렬
  const [selectedPart, setSelectedPart] = useState<Part | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('attendance_rate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');

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
      case 'last_3_months':
        return {
          startDate: format(subMonths(today, 3), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
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

  // 데이터 조회
  const { data, isLoading, error } = useMemberAttendanceStats({
    startDate,
    endDate,
    part: selectedPart !== 'ALL' ? selectedPart : undefined,
    sortBy,
    order: sortOrder,
  });

  // 검색 필터링
  const members = data?.members ?? [];
  const filteredMembers = useMemo(() => {
    if (members.length === 0) return [];

    if (!searchQuery.trim()) return members;

    const query = searchQuery.toLowerCase();
    return members.filter((member) => member.memberName.toLowerCase().includes(query));
  }, [members, searchQuery]);

  // 정렬 토글
  const handleSortToggle = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'name' ? 'asc' : 'desc');
    }
  };

  // 출석률에 따른 색상
  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-[var(--color-success-600)]';
    if (rate >= 70) return 'text-[var(--color-warning-600)]';
    return 'text-[var(--color-error-600)]';
  };

  // 순위 메달 색상
  const getRankBadge = (index: number) => {
    if (sortBy !== 'attendance_rate' || sortOrder !== 'desc') return null;

    if (index === 0) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <Card className="border-none p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-[var(--color-background-secondary)]"></div>
          <div className="h-10 w-full rounded bg-[var(--color-background-secondary)]"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded bg-[var(--color-background-secondary)]"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <Card className="border-none p-6 shadow-sm">
        <div className="py-8 text-center">
          <div className="mb-2 text-[var(--color-error-500)]">통계 조회 실패</div>
          <p className="text-sm text-[var(--color-text-secondary)]">{error.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            다시 시도
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-none bg-[var(--color-background-primary)] p-6 shadow-sm">
      {/* 헤더 */}
      <div className="mb-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]">
          <Users className="h-5 w-5 text-[var(--color-primary-600)]" />
          대원별 출석 통계
        </h2>

        {/* 날짜 범위 선택 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[
            { value: 'this_month', label: '이번 달' },
            { value: 'last_month', label: '지난 달' },
            { value: 'last_3_months', label: '최근 3개월' },
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

        {/* 커스텀 날짜 선택 */}
        {dateRangePreset === 'custom' && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-[var(--color-background-secondary)] p-4">
            <Calendar className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap text-gray-600">시작일:</Label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <span className="text-gray-400">~</span>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap text-gray-600">종료일:</Label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        )}

        {/* 필터 및 검색 */}
        <div className="flex flex-wrap items-center gap-4">
          {/* 파트 필터 */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedPart}
              onChange={(e) => setSelectedPart(e.target.value as Part | 'ALL')}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">전체 파트</option>
              <option value="SOPRANO">소프라노</option>
              <option value="ALTO">알토</option>
              <option value="TENOR">테너</option>
              <option value="BASS">베이스</option>
              <option value="SPECIAL">특별</option>
            </select>
          </div>

          {/* 검색 */}
          <Input
            type="text"
            placeholder="이름 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48"
          />
        </div>

        {/* 기간 표시 */}
        <div className="mt-3 text-sm text-gray-500">
          기간: {startDate} ~ {endDate}
          {data?.period?.totalServiceDates !== undefined && (
            <span className="ml-4">
              • 총 예배 횟수:{' '}
              <span className="font-semibold text-[var(--color-text-primary)]">
                {data.period.totalServiceDates}회
              </span>
            </span>
          )}
          {data?.summary && (
            <span className="ml-4">
              • 평균 출석률:{' '}
              <span className={getAttendanceRateColor(data.summary.averageAttendanceRate)}>
                {data.summary.averageAttendanceRate}%
              </span>
            </span>
          )}
        </div>
      </div>

      {/* 데이터 테이블 */}
      {filteredMembers.length === 0 ? (
        <div className="py-12 text-center text-gray-500">해당 조건의 출석 기록이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">순위</th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-sm font-medium text-gray-600 hover:bg-gray-50"
                  onClick={() => handleSortToggle('name')}
                >
                  <div className="flex items-center gap-1">
                    이름
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">파트</th>
                <th
                  className="cursor-pointer px-4 py-3 text-center text-sm font-medium text-gray-600 hover:bg-gray-50"
                  onClick={() => handleSortToggle('total_records')}
                >
                  <div className="flex items-center justify-center gap-1">
                    기록/예배
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">등단</th>
                <th
                  className="px-4 py-3 text-center text-sm font-medium text-gray-600"
                  title="실제 미등단으로 기록된 횟수"
                >
                  미등단
                </th>
                <th
                  className="px-4 py-3 text-center text-sm font-medium text-gray-600"
                  title="출석 기록이 없는 날짜 (미입력)"
                >
                  미입력
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-center text-sm font-medium text-gray-600 hover:bg-gray-50"
                  onClick={() => handleSortToggle('attendance_rate')}
                >
                  <div className="flex items-center justify-center gap-1">
                    출석률
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member, index) => {
                const partColors = PART_COLORS[member.part];
                const isTop = sortBy === 'attendance_rate' && sortOrder === 'desc' && index < 3;
                const isBottom =
                  sortBy === 'attendance_rate' &&
                  sortOrder === 'desc' &&
                  member.attendanceRate < 50 &&
                  member.totalRecords > 0;

                return (
                  <tr
                    key={member.memberId}
                    className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                      isTop ? 'bg-yellow-50/50' : isBottom ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getRankBadge(index)}
                        <span className="text-sm text-gray-600">{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{member.memberName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${partColors.badge}`}
                      >
                        {member.part}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <span
                        className={
                          member.totalRecords < member.expectedRecords
                            ? 'text-orange-600'
                            : 'text-gray-600'
                        }
                      >
                        {member.totalRecords}/{member.expectedRecords}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-green-600">
                      {member.availableCount}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {/* 실제 미등단 = 전체 미등단 - 미입력 */}
                      {member.unavailableCount - member.missingRecords > 0 ? (
                        <span className="font-medium text-red-600">
                          {member.unavailableCount - member.missingRecords}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {/* 미입력 = 출석 기록이 없는 날짜 */}
                      {member.missingRecords > 0 ? (
                        <span className="font-medium text-orange-500">{member.missingRecords}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-gray-200">
                          <div
                            className={`h-2 rounded-full ${
                              member.attendanceRate >= 90
                                ? 'bg-green-500'
                                : member.attendanceRate >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${member.attendanceRate}%` }}
                          />
                        </div>
                        <span
                          className={`text-sm font-semibold ${getAttendanceRateColor(member.attendanceRate)}`}
                        >
                          {member.attendanceRate}%
                        </span>
                        {member.attendanceRate >= 90 && (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        )}
                        {member.attendanceRate < 50 && member.totalRecords > 0 && (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 요약 정보 */}
      {data?.summary && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <div>
              <span className="font-medium">총 대원:</span> {data.summary.totalMembers}명
            </div>
            <div>
              <span className="font-medium">총 예배:</span> {data.period?.totalServiceDates || 0}회
            </div>
            <div>
              <span className="font-medium">평균 출석률:</span>{' '}
              <span className={getAttendanceRateColor(data.summary.averageAttendanceRate)}>
                {data.summary.averageAttendanceRate}%
              </span>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-xs text-gray-400">
            <p>
              * <span className="font-medium text-green-600">등단</span>: 실제 등단 기록 횟수
            </p>
            <p>
              * <span className="font-medium text-red-600">미등단</span>: 실제 미등단으로 기록된
              횟수
            </p>
            <p>
              * <span className="font-medium text-orange-500">미입력</span>: 출석 기록이 없는 날짜
              (출석률 계산 시 미등단으로 처리)
            </p>
            <p>* 출석률 = 등단 / 총 예배 횟수 × 100</p>
          </div>
        </div>
      )}
    </Card>
  );
}
