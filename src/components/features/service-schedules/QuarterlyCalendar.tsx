'use client';

import { useMemo, useState } from 'react';
import { Plus, Edit2, Music, User, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ServiceScheduleDialog from './ServiceScheduleDialog';
import type { Database } from '@/types/database.types';

type ServiceSchedule = Database['public']['Tables']['service_schedules']['Row'];

interface QuarterlyCalendarProps {
  year: number;
  quarter: number;
  schedules: ServiceSchedule[];
  onRefresh: () => void;
}

/**
 * 분기 내 모든 일요일 날짜 계산
 */
function getSundaysInQuarter(year: number, quarter: number): string[] {
  const startMonth = (quarter - 1) * 3; // 0-based
  const endMonth = quarter * 3 - 1;
  const sundays: string[] = [];

  for (let month = startMonth; month <= endMonth; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 0) {
        // Sunday - 로컬 시간대 기준으로 YYYY-MM-DD 형식 생성
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        sundays.push(`${yyyy}-${mm}-${dd}`);
      }
    }
  }

  return sundays;
}

/**
 * 날짜가 일요일인지 확인
 */
function isSunday(dateStr: string): boolean {
  const date = new Date(dateStr);
  return date.getDay() === 0;
}

/**
 * 요일 이름 반환
 */
function getDayName(dateStr: string): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

export default function QuarterlyCalendar({
  year,
  quarter,
  schedules,
  onRefresh,
}: QuarterlyCalendarProps) {
  const [editingSchedule, setEditingSchedule] =
    useState<ServiceSchedule | null>(null);
  const [creatingDate, setCreatingDate] = useState<string | null>(null);

  const sundays = useMemo(
    () => getSundaysInQuarter(year, quarter),
    [year, quarter]
  );

  // 날짜별 스케줄 맵
  const scheduleMap = useMemo(() => {
    const map = new Map<string, ServiceSchedule>();
    schedules.forEach((s) => map.set(s.date, s));
    return map;
  }, [schedules]);

  // 특별예배 (일요일이 아닌 날짜) 추출
  const specialServiceDates = useMemo(() => {
    return schedules
      .filter((s) => !isSunday(s.date))
      .map((s) => s.date);
  }, [schedules]);

  // 일요일 + 특별예배 날짜를 합쳐서 정렬
  const allDates = useMemo(() => {
    const sundaySet = new Set(sundays);
    const combined = [...sundays];

    // 특별예배 날짜 중 일요일이 아닌 것만 추가
    specialServiceDates.forEach((date) => {
      if (!sundaySet.has(date)) {
        combined.push(date);
      }
    });

    return combined.sort();
  }, [sundays, specialServiceDates]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isPast = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  return (
    <div className="space-y-3">
      {allDates.map((dateStr) => {
        const schedule = scheduleMap.get(dateStr);
        const past = isPast(dateStr);
        const today = isToday(dateStr);
        const isSpecialService = !isSunday(dateStr);

        return (
          <Card
            key={dateStr}
            className={`
              transition-all
              ${isSpecialService ? 'border-l-4 border-l-orange-400 bg-orange-50/30' : ''}
              ${schedule && !isSpecialService ? 'border-[var(--color-primary-200)]' : ''}
              ${today ? 'ring-2 ring-[var(--color-primary-500)]' : ''}
              ${past && !schedule ? 'opacity-60' : ''}
            `}
          >
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  {formatDate(dateStr)}
                  {isSpecialService && (
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      ({getDayName(dateStr)})
                    </span>
                  )}
                  {today && (
                    <span className="text-xs bg-[var(--color-primary-500)] text-white px-2 py-0.5 rounded-full">
                      오늘
                    </span>
                  )}
                  {isSpecialService && (
                    <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300 bg-orange-50">
                      <Star className="h-3 w-3" />
                      특별예배
                    </Badge>
                  )}
                </CardTitle>
                {schedule ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingSchedule(schedule)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                ) : !isSpecialService ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setCreatingDate(dateStr)}
                  >
                    <Plus className="h-4 w-4" />
                    등록
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            {schedule && (
              <CardContent className="pt-0 pb-3 px-4">
                <div className="space-y-1.5 text-sm">
                  <div className={`font-medium ${isSpecialService ? 'text-orange-700' : 'text-[var(--color-text-secondary)]'}`}>
                    {schedule.service_type || '주일예배'}
                  </div>
                  {schedule.hymn_name && (
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-[var(--color-primary-500)] flex-shrink-0" />
                      <span>{schedule.hymn_name}</span>
                    </div>
                  )}
                  {schedule.offertory_performer && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
                      <span className="text-[var(--color-text-secondary)]">
                        봉헌송: {schedule.offertory_performer}
                      </span>
                    </div>
                  )}
                  {schedule.notes && (
                    <div className="text-[var(--color-text-tertiary)] mt-2 text-xs bg-[var(--color-background-secondary)] p-2 rounded">
                      {schedule.notes}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* 생성/수정 다이얼로그 */}
      <ServiceScheduleDialog
        open={!!editingSchedule || !!creatingDate}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSchedule(null);
            setCreatingDate(null);
          }
        }}
        schedule={editingSchedule}
        date={creatingDate}
        onSuccess={() => {
          setEditingSchedule(null);
          setCreatingDate(null);
          onRefresh();
        }}
      />
    </div>
  );
}
