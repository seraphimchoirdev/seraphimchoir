'use client';
'use memo';

import { Clock, Edit2, MapPin, Music, PartyPopper, Plus, Star, User } from 'lucide-react';

import { memo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { EVENT_TYPE_LABELS, type EventType } from '@/hooks/useChoirEvents';

import type { Database } from '@/types/database.types';

// 후드 색상별 스타일
export const HOOD_COLOR_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  백: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  녹: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  보라: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  적: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  검정: { bg: 'bg-gray-800', text: 'text-white', border: 'border-gray-900' },
};

type ServiceScheduleBase = Database['public']['Tables']['service_schedules']['Row'];
export type ServiceSchedule = ServiceScheduleBase & {
  pre_practice_start_time?: string | null;
};
export type ChoirEvent = Database['public']['Tables']['choir_events']['Row'];

// 예배 유형별 정렬 우선순위 (낮을수록 먼저)
export const SERVICE_TYPE_ORDER: Record<string, number> = {
  '주일 2부 예배': 1,
  오후찬양예배: 2,
  온세대예배: 3,
  절기찬양예배: 4,
};

export function isSunday(dateStr: string): boolean {
  const date = new Date(dateStr);
  return date.getDay() === 0;
}

export function getDayName(dateStr: string): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

export function isPast(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

export interface DateCardProps {
  dateStr: string;
  dateSchedules: ServiceSchedule[];
  dateEvents: ChoirEvent[];
  isSpecialService: boolean;
  canManageService?: boolean;
  onEditSchedule: (schedule: ServiceSchedule) => void;
  onCreateSchedule: (date: string) => void;
  onEditEvent: (event: ChoirEvent) => void;
  onCreateEvent: (date: string) => void;
}

export const DateCard = memo(function DateCard({
  dateStr,
  dateSchedules,
  dateEvents,
  isSpecialService,
  canManageService = true,
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
      className={`transition-all ${isSpecialService ? 'border-l-4 border-l-orange-400 bg-orange-50/30' : ''} ${hasOnlyEvents ? 'border-l-4 border-l-purple-400 bg-purple-50/30' : ''} ${hasSchedules && !isSpecialService ? 'border-[var(--color-primary-200)]' : ''} ${today ? 'ring-2 ring-[var(--color-primary-500)]' : ''} ${past && !hasSchedules && dateEvents.length === 0 ? 'opacity-60' : ''} `}
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            {formatDate(dateStr)}
            <span className="text-xs text-[var(--color-text-tertiary)]">
              (
              {isSpecialService
                ? getDayName(dateStr)
                : isSunday(dateStr)
                  ? '주일'
                  : getDayName(dateStr)}
              )
            </span>
            {today && (
              <span className="rounded-full bg-[var(--color-primary-500)] px-2 py-0.5 text-xs text-white">
                오늘
              </span>
            )}
            {isSpecialService && (
              <Badge
                variant="outline"
                className="gap-1 border-orange-300 bg-orange-50 text-orange-600"
              >
                <Star className="h-3 w-3" />
                특별예배
              </Badge>
            )}
          </CardTitle>
          {canManageService && (
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
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                onClick={() => onCreateEvent(dateStr)}
              >
                <PartyPopper className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      {/* 예배 일정 (같은 날짜에 여러 일정 지원) */}
      {dateSchedules.length > 0 && (
        <CardContent className="px-4 pt-0 pb-3">
          <div className="space-y-4">
            {dateSchedules.map((schedule, idx) => (
              <div
                key={schedule.id}
                className={`space-y-1.5 text-sm ${idx > 0 ? 'border-t border-[var(--color-border-subtle)] pt-3' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-medium ${isSpecialService ? 'text-orange-700' : 'text-[var(--color-text-secondary)]'}`}
                    >
                      {schedule.service_type || '주일예배'}
                    </span>
                    {schedule.hood_color && HOOD_COLOR_STYLES[schedule.hood_color] && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${HOOD_COLOR_STYLES[schedule.hood_color].bg} ${HOOD_COLOR_STYLES[schedule.hood_color].text} ${HOOD_COLOR_STYLES[schedule.hood_color].border}`}
                      >
                        {schedule.hood_color}색 후드
                      </Badge>
                    )}
                  </div>
                  {canManageService && idx > 0 && (
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
                    <Music className="h-4 w-4 flex-shrink-0 text-[var(--color-primary-500)]" />
                    <span>
                      {schedule.hymn_name}
                      {schedule.composer && (
                        <span className="ml-1 text-[var(--color-text-tertiary)]">
                          ({schedule.composer})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {schedule.offertory_performer && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
                    <span className="text-[var(--color-text-secondary)]">
                      봉헌송: {schedule.offertory_performer}
                    </span>
                  </div>
                )}

                {schedule.notes && (
                  <div className="mt-2 rounded bg-[var(--color-background-secondary)] p-2 text-xs text-[var(--color-text-tertiary)]">
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
        <CardContent className={`${hasSchedules ? 'pt-0' : 'pt-0'} px-4 pb-3`}>
          <div className="space-y-2">
            {hasSchedules && (
              <div className="mt-2 border-t border-[var(--color-border-subtle)] pt-2" />
            )}
            {dateEvents.map((event) => (
              <div
                key={event.id}
                className="cursor-pointer rounded-lg border border-purple-200 bg-purple-50 p-3 transition-colors hover:bg-purple-100"
                onClick={() => onEditEvent(event)}
              >
                <div className="flex items-center gap-2">
                  <PartyPopper className="h-4 w-4 flex-shrink-0 text-purple-600" />
                  <span className="font-medium text-purple-800">{event.title}</span>
                  <Badge
                    variant="outline"
                    className="ml-auto border-purple-300 text-xs text-purple-600"
                  >
                    {EVENT_TYPE_LABELS[event.event_type as EventType] || event.event_type}
                  </Badge>
                </div>
                {(event.start_time || event.location) && (
                  <div className="mt-1 flex items-center gap-4 text-xs text-purple-600">
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

export default DateCard;
