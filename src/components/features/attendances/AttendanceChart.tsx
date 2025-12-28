/**
 * AttendanceChart.tsx
 * Recharts를 사용한 출석 통계 차트 컴포넌트
 */

'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type {
  AttendanceStatistics,
  PartAttendanceStatistics,
  AttendanceSummaryByDate,
} from '@/types/attendance-stats.types';

// 차트 색상 팔레트
const COLORS = {
  available: '#10b981', // green-500
  unavailable: '#ef4444', // red-500
  soprano: '#a855f7', // purple-500
  alto: '#eab308', // yellow-500
  tenor: '#3b82f6', // blue-500
  bass: '#22c55e', // green-500
  special: '#f59e0b', // amber-500
};

interface DonutChartProps {
  data: AttendanceStatistics;
}

/**
 * 도넛 차트 - 전체 출석률 시각화
 */
export function DonutChart({ data }: DonutChartProps) {
  const chartData = useMemo(
    () => [
      { name: '출석', value: data.available_count, color: COLORS.available },
      { name: '불참', value: data.unavailable_count, color: COLORS.unavailable },
    ],
    [data]
  );

  // 데이터가 없는 경우
  if (data.total_records === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-sm">데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="value"
          label={({ name, percent }) =>
            `${name}: ${percent ? (percent * 100).toFixed(1) : 0}%`
          }
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value}건`, '']}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: PartAttendanceStatistics[];
}

/**
 * 막대 그래프 - 파트별 출석률 비교
 */
export function PartBarChart({ data }: BarChartProps) {
  const chartData = useMemo(
    () =>
      data.map((stat) => ({
        part: stat.part,
        출석률: Number(stat.attendance_rate.toFixed(1)),
        출석: stat.available_count,
        불참: stat.unavailable_count,
      })),
    [data]
  );

  const getPartColor = (part: string): string => {
    switch (part) {
      case 'SOPRANO':
        return COLORS.soprano;
      case 'ALTO':
        return COLORS.alto;
      case 'TENOR':
        return COLORS.tenor;
      case 'BASS':
        return COLORS.bass;
      case 'SPECIAL':
        return COLORS.special;
      default:
        return '#9ca3af';
    }
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-sm">데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="part"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#d1d5db' }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#d1d5db' }}
          label={{ value: '출석률 (%)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
          }}
          formatter={(value: number, name: string) => {
            if (name === '출석률') return [`${value}%`, name];
            return [`${value}건`, name];
          }}
        />
        <Legend />
        <Bar dataKey="출석률" radius={[8, 8, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getPartColor(entry.part)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TrendLineChartProps {
  data: AttendanceSummaryByDate[];
}

/**
 * 라인 차트 - 날짜별 출석률 추세
 */
export function TrendLineChart({ data }: TrendLineChartProps) {
  const chartData = useMemo(
    () =>
      data.map((summary) => ({
        date: summary.date,
        출석률: Number(summary.attendance_rate.toFixed(1)),
        출석: summary.available_count,
        불참: summary.unavailable_count,
      })),
    [data]
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-sm">데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#d1d5db' }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#d1d5db' }}
          label={{ value: '출석률 (%)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
          }}
          formatter={(value: number, name: string) => {
            if (name === '출석률') return [`${value}%`, name];
            return [`${value}건`, name];
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="출석률"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
