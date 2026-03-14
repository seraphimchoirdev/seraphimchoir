'use client';
'use memo';

import { useCallback, useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

import {
  DateCard,
  isSunday,
  SERVICE_TYPE_ORDER,
  type ChoirEvent,
  type ServiceSchedule,
} from './DateCard';

// 모달 컴포넌트 동적 import (코드 스플리팅)
const ServiceScheduleDialog = dynamic(() => import('./ServiceScheduleDialog'), {
  ssr: false,
  loading: () => null,
});
const EventDialog = dynamic(() => import('./EventDialog'), {
  ssr: false,
  loading: () => null,
});

interface QuarterlyCalendarProps {
  year: number;
  quarter: number;
  schedules: ServiceSchedule[];
  events?: ChoirEvent[];
  onRefresh: () => void;
  canDeleteSchedule?: boolean;
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
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        sundays.push(`${yyyy}-${mm}-${dd}`);
      }
    }
  }

  return sundays;
}

export default function QuarterlyCalendar({
  year,
  quarter,
  schedules,
  events = [],
  onRefresh,
  canDeleteSchedule,
}: QuarterlyCalendarProps) {
  const [editingSchedule, setEditingSchedule] = useState<ServiceSchedule | null>(null);
  const [creatingDate, setCreatingDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<ChoirEvent | null>(null);
  const [creatingEventDate, setCreatingEventDate] = useState<string | null>(null);

  const sundays = useMemo(() => getSundaysInQuarter(year, quarter), [year, quarter]);

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
