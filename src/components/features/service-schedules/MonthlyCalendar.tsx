'use client';
'use memo';

import { useMemo, useState, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Edit2, Music, User, Star, Clock, MapPin, PartyPopper, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Database } from '@/types/database.types';
import { EVENT_TYPE_LABELS, type EventType } from '@/hooks/useChoirEvents';

// 모달 컴포넌트 동적 import (코드 스플리팅)
const ServiceScheduleDialog = dynamic(() => import('./ServiceScheduleDialog'), {
  ssr: false,
  loading: () => null,
});
const EventDialog = dynamic(() => import('./EventDialog'), {
  ssr: false,
  loading: () => null,
});

// 후드 색상별 스타일
const HOOD_COLOR_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  '백': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  '녹': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  '보라': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  '적': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  '검정': { bg: 'bg-gray-800', text: 'text-white', border: 'border-gray-900' },
};

type ServiceScheduleBase = Database['public']['Tables']['service_schedules']['Row'];
// 데이터베이스 타입에 아직 반영되지 않은 필드 확장
type ServiceSchedule = ServiceScheduleBase & {
  pre_practice_start_time?: string | null;
};
type ChoirEvent = Database['public']['Tables']['choir_events']['Row'];

interface MonthlyCalendarProps {
  year: number;
  month: number; // 1-12
  schedules: ServiceSchedule[];
  events?: ChoirEvent[];
  onRefresh: () => void;
}

/**
 * 월 내 모든 일요일 날짜 계산
 */
function getSundaysInMonth(year: number, month: number): string[] {
  const sundays: string[] = [];
  // month는 1-based이므로 month - 1로 0-based로 변환
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 0) {
      // Sunday - 로컬 시간대 기준으로 YYYY-MM-DD 형식 생성
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      sundays.push(`${yyyy}-${mm}-${dd}`);
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

/**
 * 날짜 포맷 (컴포넌트 외부로 이동)
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * 오늘 날짜인지 확인 (컴포넌트 외부로 이동)
 */
function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

/**
 * 과거 날짜인지 확인 (컴포넌트 외부로 이동)
 */
function isPast(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

/**
 * 시간 포맷 (HH:mm:ss -> 오전/오후 X시 Y분) (컴포넌트 외부로 이동)
 */
function formatTimeKorean(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours < 12 ? '오전' : '오후';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  if (minutes === 0) {
    return `${period} ${hour12}시`;
  }
  return `${period} ${hour12}시 ${minutes}분`;
}

// 개별 날짜 카드 컴포넌트 (메모이제이션)
interface DateCardProps {
  dateStr: string;
  dateSchedules: ServiceSchedule[];
  dateEvents: ChoirEvent[];
  isSpecialService: boolean;
  onEditSchedule: (schedule: ServiceSchedule) => void;
  onCreateSchedule: (date: string) => void;
  onEditEvent: (event: ChoirEvent) => void;
  onCreateEvent: (date: string) => void;
}

const DateCard = memo(function DateCard({
  dateStr,
  dateSchedules,
  dateEvents,
  isSpecialService,
  onEditSchedule,
  onCreateSchedule,
  onEditEvent,
  onCreateEvent,
}: DateCardProps) {
  const past = isPast(dateStr);
  const today = isToday(dateStr);
  const hasSchedules = dateSchedules.length > 0;
  const hasOnlyEvents = !hasSchedules && dateEvents.length > 0;

  return (
    <Card
      className={`
        transition-all
        ${isSpecialService ? 'border-l-4 border-l-orange-400 bg-orange-50/30' : ''}
        ${hasOnlyEvents ? 'border-l-4 border-l-purple-400 bg-purple-50/30' : ''}
        ${hasSchedules && !isSpecialService ? 'border-[var(--color-primary-200)]' : ''}
        ${today ? 'ring-2 ring-[var(--color-primary-500)]' : ''}
        ${past && !hasSchedules && dateEvents.length === 0 ? 'opacity-60' : ''}
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
            {hasSchedules ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEditSchedule(dateSchedules[0])}
                title="첫 번째 일정 수정"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            ) : isSunday(dateStr) ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => onCreateSchedule(dateStr)}
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
              onClick={() => onCreateEvent(dateStr)}
            >
              <PartyPopper className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* 예배 일정 (같은 날짜에 여러 일정 지원) */}
      {dateSchedules.length > 0 && (
        <CardContent className="pt-0 pb-3 px-4">
          <div className="space-y-4">
            {dateSchedules.map((schedule, idx) => (
              <div
                key={schedule.id}
                className={`space-y-1.5 text-sm ${idx > 0 ? 'pt-3 border-t border-[var(--color-border-subtle)]' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${isSpecialService ? 'text-orange-700' : 'text-[var(--color-text-secondary)]'}`}>
                      {schedule.service_type || '주일예배'}
                    </span>
                    {/* 후드 색상 배지 */}
                    {schedule.hood_color && HOOD_COLOR_STYLES[schedule.hood_color] && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${HOOD_COLOR_STYLES[schedule.hood_color].bg} ${HOOD_COLOR_STYLES[schedule.hood_color].text} ${HOOD_COLOR_STYLES[schedule.hood_color].border}`}
                      >
                        {schedule.hood_color}색 후드
                      </Badge>
                    )}
                  </div>
                  {/* 개별 일정 수정 버튼 */}
                  {idx > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onEditSchedule(schedule)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {schedule.hymn_name && (
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-[var(--color-primary-500)] flex-shrink-0" />
                    <span>
                      {schedule.hymn_name}
                      {/* 작곡가/편곡자 표시 (괄호 안) */}
                      {schedule.composer && (
                        <span className="text-[var(--color-text-tertiary)] ml-1">
                          ({schedule.composer})
                        </span>
                      )}
                    </span>
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
                  {/* 예배 전 연습 */}
                  {schedule.has_pre_practice && (
                    <div className="flex items-center gap-2 text-xs">
                      <Mic className="h-3 w-3 text-blue-600 flex-shrink-0" />
                      <span className="text-blue-700 font-medium">예배 전</span>
                      <Clock className="h-3 w-3 text-blue-500" />
                      <span className="text-blue-600">
                        {schedule.pre_practice_start_time
                          ? `${formatTimeKorean(schedule.pre_practice_start_time)} 부터`
                          : '오전 7시 30분 부터'}
                      </span>
                      {schedule.pre_practice_location && (
                        <>
                          <MapPin className="h-3 w-3 text-blue-500" />
                          <span className="text-blue-600">{schedule.pre_practice_location}</span>
                        </>
                      )}
                    </div>
                  )}

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
            ))}
          </div>
        </CardContent>
      )}

      {/* 행사 목록 */}
      {dateEvents.length > 0 && (
        <CardContent className={`${hasSchedules ? 'pt-0' : 'pt-0'} pb-3 px-4`}>
          <div className="space-y-2">
            {hasSchedules && <div className="border-t border-[var(--color-border-subtle)] pt-2 mt-2" />}
            {dateEvents.map((event) => (
              <div
                key={event.id}
                className="bg-purple-50 border border-purple-200 rounded-lg p-3 cursor-pointer hover:bg-purple-100 transition-colors"
                onClick={() => onEditEvent(event)}
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
});

export default function MonthlyCalendar({
  year,
  month,
  schedules,
  events = [],
  onRefresh,
}: MonthlyCalendarProps) {
  const [editingSchedule, setEditingSchedule] =
    useState<ServiceSchedule | null>(null);
  const [creatingDate, setCreatingDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<ChoirEvent | null>(null);
  const [creatingEventDate, setCreatingEventDate] = useState<string | null>(null);

  const sundays = useMemo(
    () => getSundaysInMonth(year, month),
    [year, month]
  );

  // 날짜별 스케줄 맵 (같은 날짜에 여러 예배 유형 지원)
  // 주일 2부 예배(오전 9시)가 오후찬양예배(오후 5시)보다 먼저 표시되도록 정렬
  const scheduleMap = useMemo(() => {
    const map = new Map<string, ServiceSchedule[]>();

    // 예배 유형별 정렬 우선순위 (낮을수록 먼저)
    const SERVICE_TYPE_ORDER: Record<string, number> = {
      '주일 2부 예배': 1,    // 오전 9시
      '오후찬양예배': 2,      // 오후 5시
      '온세대예배': 3,
      '절기찬양예배': 4,
    };

    schedules.forEach((s) => {
      const existing = map.get(s.date) || [];
      existing.push(s);
      map.set(s.date, existing);
    });

    // 각 날짜의 스케줄을 예배 유형 순서대로 정렬
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

  // 콜백 함수들 메모이제이션
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
