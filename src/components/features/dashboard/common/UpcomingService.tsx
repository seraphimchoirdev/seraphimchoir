'use client';

import { Calendar, Clock, Music, Palette } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDisplayDate } from '@/lib/dashboard-context';

interface UpcomingServiceProps {
  date: string;
  serviceType?: string | null;
  hymnName?: string | null;
  hoodColor?: string | null;
  serviceStartTime?: string | null;
  prePracticeStartTime?: string | null;
}

/**
 * 다음 예배 정보 카드
 *
 * 다음 주일의 예배 정보를 표시합니다.
 * - 날짜 및 시간
 * - 찬송/송영
 * - 후드 색상
 * - 연습 시간
 */
export function UpcomingService({
  date,
  serviceType,
  hymnName,
  hoodColor,
  serviceStartTime,
  prePracticeStartTime,
}: UpcomingServiceProps) {
  const displayDate = formatDisplayDate(date);

  // 시간 포맷 (HH:MM 형식에서 표시용으로 변환)
  const formatTime = (time: string | null) => {
    if (!time) return null;
    // HH:MM:SS 또는 HH:MM 형식 처리
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-[var(--color-primary-500)]" />
          다음 예배
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 날짜 및 시간 */}
        <div className="rounded-lg bg-[var(--color-background-tertiary)] p-3">
          <div className="font-medium text-[var(--color-text-primary)]">{displayDate}</div>
          {serviceStartTime && (
            <div className="mt-1 flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
              <Clock className="h-3.5 w-3.5" />
              <span>예배 {formatTime(serviceStartTime)}</span>
            </div>
          )}
          {serviceType && (
            <div className="mt-1 text-xs text-[var(--color-text-tertiary)]">{serviceType}</div>
          )}
        </div>

        {/* 찬양 */}
        {hymnName && (
          <div className="flex items-start gap-2">
            <Music className="mt-0.5 h-4 w-4 text-[var(--color-text-tertiary)]" />
            <div>
              <div className="text-sm font-medium text-[var(--color-text-primary)]">찬양</div>
              <div className="text-sm text-[var(--color-text-secondary)]">{hymnName}</div>
            </div>
          </div>
        )}

        {/* 후드 색상 */}
        {hoodColor && (
          <div className="flex items-start gap-2">
            <Palette className="mt-0.5 h-4 w-4 text-[var(--color-text-tertiary)]" />
            <div>
              <div className="text-sm font-medium text-[var(--color-text-primary)]">후드 색상</div>
              <HoodColorBadge color={hoodColor} />
            </div>
          </div>
        )}

        {/* 연습 시간 */}
        {prePracticeStartTime && (
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 text-[var(--color-text-tertiary)]" />
            <div>
              <div className="text-sm font-medium text-[var(--color-text-primary)]">연습 시간</div>
              <div className="text-sm text-[var(--color-text-secondary)]">
                {formatTime(prePracticeStartTime)}
              </div>
            </div>
          </div>
        )}

        {/* 정보 없음 안내 */}
        {!hymnName && !hoodColor && !prePracticeStartTime && (
          <p className="text-center text-sm text-[var(--color-text-tertiary)]">
            아직 등록된 정보가 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const HOOD_COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  백: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-white border border-gray-300' },
  녹: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  보라: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  적: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  검정: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-800' },
};

function HoodColorBadge({ color }: { color: string }) {
  const style = HOOD_COLOR_MAP[color] ?? {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  };

  return (
    <span
      className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
      {color}
    </span>
  );
}

export default UpcomingService;
