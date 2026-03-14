'use client';
'use memo';

import { ArrowRight, CalendarCheck } from 'lucide-react';

import { useCallback, useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';

import {
  DateCard,
  isSunday,
  SERVICE_TYPE_ORDER,
  type ChoirEvent,
  type ServiceSchedule,
} from './DateCard';

const ServiceScheduleDialog = dynamic(() => import('./ServiceScheduleDialog'), {
  ssr: false,
  loading: () => null,
});
const EventDialog = dynamic(() => import('./EventDialog'), {
  ssr: false,
  loading: () => null,
});

interface UpcomingCalendarProps {
  startDate: string; // YYYY-MM-DD (오늘)
  endDate: string; // YYYY-MM-DD (5주 후)
  schedules: ServiceSchedule[];
  events?: ChoirEvent[];
  onRefresh: () => void;
  onShowPastSchedules?: () => void;
  canDeleteSchedule?: boolean;
}

/**
 * 날짜 범위 내 모든 일요일 계산
 */
function getSundaysInRange(startDate: string, endDate: string): string[] {
  const sundays: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // 시작일에서 가장 가까운 일요일 찾기
  const current = new Date(start);
  const dayOfWeek = current.getDay();
  if (dayOfWeek !== 0) {
    current.setDate(current.getDate() + (7 - dayOfWeek));
  }

  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    sundays.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 7);
  }

  return sundays;
}

export default function UpcomingCalendar({
  startDate,
  endDate,
  schedules,
  events = [],
  onRefresh,
  onShowPastSchedules,
  canDeleteSchedule,
}: UpcomingCalendarProps) {
  const [editingSchedule, setEditingSchedule] = useState<ServiceSchedule | null>(null);
  const [creatingDate, setCreatingDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<ChoirEvent | null>(null);
  const [creatingEventDate, setCreatingEventDate] = useState<string | null>(null);

  const sundays = useMemo(() => getSundaysInRange(startDate, endDate), [startDate, endDate]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, ServiceSchedule[]>();

    schedules.forEach((s) => {
      const existing = map.get(s.date) || [];
      existing.push(s);
      map.set(s.date, existing);
    });

    map.forEach((dateSchedules, date) => {
      dateSchedules.sort((a, b) => {
        const orderA = SERVICE_TYPE_ORDER[a.service_type || ''] ?? 99;
        const orderB = SERVICE_TYPE_ORDER[b.service_type || ''] ?? 99;
        return orderA - orderB;
      });
      map.set(date, dateSchedules);
    });

    return map;
  }, [schedules]);

  const eventMap = useMemo(() => {
    const map = new Map<string, ChoirEvent[]>();
    events.forEach((e) => {
      const existing = map.get(e.date) || [];
      existing.push(e);
      map.set(e.date, existing);
    });
    return map;
  }, [events]);

  const specialServiceDates = useMemo(() => {
    return schedules.filter((s) => !isSunday(s.date)).map((s) => s.date);
  }, [schedules]);

  const eventDates = useMemo(() => {
    return events.map((e) => e.date);
  }, [events]);

  const allDates = useMemo(() => {
    const dateSet = new Set(sundays);
    specialServiceDates.forEach((date) => dateSet.add(date));
    eventDates.forEach((date) => dateSet.add(date));
    return Array.from(dateSet).sort();
  }, [sundays, specialServiceDates, eventDates]);

  const handleEditSchedule = useCallback((schedule: ServiceSchedule) => {
    setEditingSchedule(schedule);
  }, []);

  const handleCreateSchedule = useCallback((date: string) => {
    setCreatingDate(date);
  }, []);

  const handleEditEvent = useCallback((event: ChoirEvent) => {
    setEditingEvent(event);
  }, []);

  const handleCreateEvent = useCallback((date: string) => {
    setCreatingEventDate(date);
  }, []);

  return (
    <div className="space-y-3">
      {allDates.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-[var(--color-text-tertiary)]">
          <CalendarCheck className="h-10 w-10" />
          <p className="text-sm">다가오는 일정이 없습니다</p>
        </div>
      )}

      {allDates.map((dateStr) => {
        const dateSchedules = scheduleMap.get(dateStr) || [];
        const dateEvents = eventMap.get(dateStr) || [];
        const hasSchedules = dateSchedules.length > 0;
        const isSpecialService = !isSunday(dateStr) && hasSchedules;

        return (
          <DateCard
            key={dateStr}
            dateStr={dateStr}
            dateSchedules={dateSchedules}
            dateEvents={dateEvents}
            isSpecialService={isSpecialService}
            onEditSchedule={handleEditSchedule}
            onCreateSchedule={handleCreateSchedule}
            onEditEvent={handleEditEvent}
            onCreateEvent={handleCreateEvent}
          />
        );
      })}

      {/* 지난 일정 보기 버튼 */}
      {onShowPastSchedules && (
        <div className="flex justify-center pt-2 pb-4">
          <Button
            variant="ghost"
            className="gap-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            onClick={onShowPastSchedules}
          >
            지난 일정 보기
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

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
        canDelete={canDeleteSchedule}
      />

      <EventDialog
        open={!!editingEvent || !!creatingEventDate}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEvent(null);
            setCreatingEventDate(null);
          }
        }}
        event={editingEvent}
        date={creatingEventDate}
        onSuccess={() => {
          setEditingEvent(null);
          setCreatingEventDate(null);
          onRefresh();
        }}
      />
    </div>
  );
}
