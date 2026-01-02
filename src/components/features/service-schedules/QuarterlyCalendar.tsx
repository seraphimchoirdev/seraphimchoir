'use client';

import { useMemo, useState } from 'react';
import { Plus, Edit2, Music, User, Star, Clock, MapPin, PartyPopper, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ServiceScheduleDialog from './ServiceScheduleDialog';
import EventDialog from './EventDialog';
import type { Database } from '@/types/database.types';
import { EVENT_TYPE_LABELS, type EventType } from '@/hooks/useChoirEvents';

type ServiceSchedule = Database['public']['Tables']['service_schedules']['Row'];
type ChoirEvent = Database['public']['Tables']['choir_events']['Row'];

interface QuarterlyCalendarProps {
  year: number;
  quarter: number;
  schedules: ServiceSchedule[];
  events?: ChoirEvent[];
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
  events = [],
  onRefresh,
}: QuarterlyCalendarProps) {
  const [editingSchedule, setEditingSchedule] =
    useState<ServiceSchedule | null>(null);
  const [creatingDate, setCreatingDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<ChoirEvent | null>(null);
  const [creatingEventDate, setCreatingEventDate] = useState<string | null>(null);

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

  // 날짜별 이벤트 맵
  const eventMap = useMemo(() => {
    const map = new Map<string, ChoirEvent[]>();
    events.forEach((e) => {
      const existing = map.get(e.date) || [];
      existing.push(e);
      map.set(e.date, existing);
    });
    return map;
  }, [events]);

  // 특별예배 (일요일이 아닌 날짜) 추출
  const specialServiceDates = useMemo(() => {
    return schedules
      .filter((s) => !isSunday(s.date))
      .map((s) => s.date);
  }, [schedules]);

  // 행사 날짜 추출
  const eventDates = useMemo(() => {
    return events.map((e) => e.date);
  }, [events]);

  // 일요일 + 특별예배 + 행사 날짜를 합쳐서 정렬
  const allDates = useMemo(() => {
    const dateSet = new Set(sundays);

    // 특별예배 날짜 추가
    specialServiceDates.forEach((date) => dateSet.add(date));

    // 행사 날짜 추가
    eventDates.forEach((date) => dateSet.add(date));

    return Array.from(dateSet).sort();
  }, [sundays, specialServiceDates, eventDates]);

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

  // 시간 포맷 (HH:mm:ss → 오전/오후 X시 Y분)
  const formatTimeKorean = (timeStr: string | null) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours < 12 ? '오전' : '오후';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    if (minutes === 0) {
      return `${period} ${hour12}시`;
    }
    return `${period} ${hour12}시 ${minutes}분`;
  };

  return (
    <div className="space-y-3">
      {allDates.map((dateStr) => {
        const schedule = scheduleMap.get(dateStr);
        const dateEvents = eventMap.get(dateStr) || [];
        const past = isPast(dateStr);
        const today = isToday(dateStr);
        const isSpecialService = !isSunday(dateStr) && schedule;
        const hasOnlyEvents = !schedule && dateEvents.length > 0;

        return (
          <Card
            key={dateStr}
            className={`
              transition-all
              ${isSpecialService ? 'border-l-4 border-l-orange-400 bg-orange-50/30' : ''}
              ${hasOnlyEvents ? 'border-l-4 border-l-purple-400 bg-purple-50/30' : ''}
              ${schedule && !isSpecialService ? 'border-[var(--color-primary-200)]' : ''}
              ${today ? 'ring-2 ring-[var(--color-primary-500)]' : ''}
              ${past && !schedule && dateEvents.length === 0 ? 'opacity-60' : ''}
            `}
          >
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  {formatDate(dateStr)}
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    ({isSpecialService ? getDayName(dateStr) : isSunday(dateStr) ? '주일' : getDayName(dateStr)})
                  </span>
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
                <div className="flex items-center gap-1">
                  {schedule ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingSchedule(schedule)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  ) : isSunday(dateStr) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setCreatingDate(dateStr)}
                    >
                      <Plus className="h-4 w-4" />
                      예배
                    </Button>
                  ) : null}
                  {/* 행사 추가 버튼 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    onClick={() => setCreatingEventDate(dateStr)}
                  >
                    <PartyPopper className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* 예배 일정 */}
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

                  {/* 연습 정보 표시 */}
                  <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] space-y-1">
                    {/* 예배 전 연습 (항상 필수) */}
                    <div className="flex items-center gap-2 text-xs">
                      <Mic className="h-3 w-3 text-blue-600 flex-shrink-0" />
                      <span className="text-blue-700 font-medium">예배 전</span>
                      <Clock className="h-3 w-3 text-blue-500" />
                      <span className="text-blue-600">오전 7시 30분 부터</span>
                      {schedule.pre_practice_location && (
                        <>
                          <MapPin className="h-3 w-3 text-blue-500" />
                          <span className="text-blue-600">{schedule.pre_practice_location}</span>
                        </>
                      )}
                    </div>

                    {/* 예배 후 연습 (선택적) */}
                    {schedule.has_post_practice && (
                      <div className="flex items-center gap-2 text-xs">
                        <Mic className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="text-green-700 font-medium">예배 후</span>
                        <Clock className="h-3 w-3 text-green-500" />
                        <span className="text-green-600">
                          {schedule.post_practice_start_time
                            ? `${formatTimeKorean(schedule.post_practice_start_time)} 부터`
                            : '오전 10시 30분 부터'}
                        </span>
                        {schedule.post_practice_location && (
                          <>
                            <MapPin className="h-3 w-3 text-green-500" />
                            <span className="text-green-600">{schedule.post_practice_location}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {schedule.notes && (
                    <div className="text-[var(--color-text-tertiary)] mt-2 text-xs bg-[var(--color-background-secondary)] p-2 rounded">
                      {schedule.notes}
                    </div>
                  )}
                </div>
              </CardContent>
            )}

            {/* 행사 목록 */}
            {dateEvents.length > 0 && (
              <CardContent className={`${schedule ? 'pt-0' : 'pt-0'} pb-3 px-4`}>
                <div className="space-y-2">
                  {schedule && <div className="border-t border-[var(--color-border-subtle)] pt-2 mt-2" />}
                  {dateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-purple-50 border border-purple-200 rounded-lg p-3 cursor-pointer hover:bg-purple-100 transition-colors"
                      onClick={() => setEditingEvent(event)}
                    >
                      <div className="flex items-center gap-2">
                        <PartyPopper className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <span className="font-medium text-purple-800">{event.title}</span>
                        <Badge variant="outline" className="ml-auto text-xs text-purple-600 border-purple-300">
                          {EVENT_TYPE_LABELS[event.event_type as EventType] || event.event_type}
                        </Badge>
                      </div>
                      {(event.start_time || event.location) && (
                        <div className="flex items-center gap-4 mt-1 text-xs text-purple-600">
                          {event.start_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {event.start_time.slice(0, 5)}
                                {event.end_time && ` ~ ${event.end_time.slice(0, 5)}`}
                              </span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* 예배 일정 생성/수정 다이얼로그 */}
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

      {/* 행사 생성/수정 다이얼로그 */}
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
