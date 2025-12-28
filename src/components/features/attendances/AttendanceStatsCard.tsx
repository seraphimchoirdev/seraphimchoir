/**
 * AttendanceStatsCard.tsx
 * KPI 통계 카드 컴포넌트 - 재사용 가능한 통계 표시 카드
 */

'use client';

import type { LucideIcon } from 'lucide-react';

interface AttendanceStatsCardProps {
  /** 카드 제목 */
  title: string;
  /** 표시할 값 (숫자 또는 문자열) */
  value: string | number;
  /** 단위 (선택사항, 예: "명", "%", "건") */
  unit?: string;
  /** Lucide 아이콘 컴포넌트 */
  icon?: LucideIcon;
  /** 배경 색상 클래스 */
  bgColor?: string;
  /** 텍스트 색상 클래스 */
  textColor?: string;
  /** 아이콘 색상 클래스 */
  iconColor?: string;
  /** 이전 값과의 비교 (선택사항) */
  comparison?: {
    /** 이전 값 */
    previousValue: number;
    /** 증가/감소 표시 여부 */
    showTrend?: boolean;
  };
}

/**
 * 통계 카드 컴포넌트
 *
 * @example
 * ```tsx
 * import { Users } from 'lucide-react';
 *
 * <AttendanceStatsCard
 *   title="총 찬양대원"
 *   value={50}
 *   unit="명"
 *   icon={Users}
 *   bgColor="bg-gray-50"
 *   textColor="text-gray-900"
 *   iconColor="text-gray-600"
 * />
 * ```
 */
export default function AttendanceStatsCard({
  title,
  value,
  unit = '',
  icon: Icon,
  bgColor = 'bg-gray-50',
  textColor = 'text-gray-900',
  iconColor = 'text-gray-600',
  comparison,
}: AttendanceStatsCardProps) {
  // 증감률 계산
  const getTrendInfo = () => {
    if (!comparison || comparison.previousValue === 0) return null;

    const currentValue = typeof value === 'string' ? parseFloat(value) : value;
    const change = currentValue - comparison.previousValue;
    const changePercent = (change / comparison.previousValue) * 100;

    return {
      change,
      changePercent,
      isIncrease: change > 0,
      isDecrease: change < 0,
    };
  };

  const trend = getTrendInfo();

  return (
    <div className={`${bgColor} rounded-lg p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm text-gray-600 font-medium">{title}</div>
        {Icon && (
          <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <div className={`text-2xl font-bold ${textColor}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {unit && (
          <div className={`text-sm ${textColor} opacity-75`}>{unit}</div>
        )}
      </div>

      {/* 추세 표시 (선택사항) */}
      {comparison?.showTrend && trend && (
        <div className="mt-2 flex items-center gap-1">
          {trend.isIncrease && (
            <svg
              className="h-4 w-4 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          )}
          {trend.isDecrease && (
            <svg
              className="h-4 w-4 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          )}
          <span
            className={`text-xs font-medium ${
              trend.isIncrease ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.isIncrease ? '+' : ''}
            {trend.changePercent.toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500">vs 이전 기간</span>
        </div>
      )}
    </div>
  );
}
