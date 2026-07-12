'use client';

import { format, isToday } from 'date-fns';
import { BellRing, Loader2, Users } from 'lucide-react';
import Link from 'next/link';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { formatDisplayDate } from '@/lib/dashboard-context';
import { MANUAL_NOTIFY_ROLES } from '@/lib/notifications/notify-constants';
import { showError, showSuccess, showWarning } from '@/lib/toast';
import type { AttendanceSummaryItem } from '@/app/api/dashboard/conductor-status/route';

interface AttendanceSummaryCardProps {
  nextServiceDate: string;
  summaries: AttendanceSummaryItem[];
}

/**
 * 파트별 마지막 저장 시각 표시 (간결 모드).
 * - 당일: HH:mm (예: 14:23) — 시·분 정밀도
 * - 그 외: M/d (예: 5/1) — 일자만, 분 정밀도는 title 툴팁의 raw ISO에서 확인
 */
function formatLastUpdated(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return isToday(d) ? format(d, 'HH:mm') : format(d, 'M/d');
}

/**
 * 응답 활성도 색 점 — "파트장이 최근 입력했는가"를 한눈에.
 * 임계값: 24h 이내(녹색), 24-72h(호박색), 그 외 또는 저장 없음(회색)
 */
function getRecencyDotClass(iso: string | null): string {
  if (!iso) return 'bg-[var(--color-text-tertiary)]';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'bg-[var(--color-text-tertiary)]';
  const hours = (Date.now() - t) / 36e5;
  if (hours <= 24) return 'bg-[var(--color-success-500)]';
  if (hours <= 72) return 'bg-[var(--color-warning-500)]';
  return 'bg-[var(--color-text-tertiary)]';
}

const PART_LABELS: Record<string, string> = {
  SOPRANO: 'S',
  ALTO: 'A',
  TENOR: 'T',
  BASS: 'B',
};

/** 파트별 색상 매핑 (globals.css의 CSS 변수 활용) */
const PART_CARD_COLORS: Record<string, { bg: string; border: string; label: string; count: string }> = {
  SOPRANO: {
    bg: 'bg-[var(--color-part-soprano-50)]',
    border: 'border-[var(--color-part-soprano-200)]',
    label: 'text-[var(--color-part-soprano-600)]',
    count: 'text-[var(--color-part-soprano-700)]',
  },
  ALTO: {
    bg: 'bg-[var(--color-part-alto-50)]',
    border: 'border-[var(--color-part-alto-200)]',
    label: 'text-[var(--color-part-alto-600)]',
    count: 'text-[var(--color-part-alto-700)]',
  },
  TENOR: {
    bg: 'bg-[var(--color-part-tenor-50)]',
    border: 'border-[var(--color-part-tenor-200)]',
    label: 'text-[var(--color-part-tenor-600)]',
    count: 'text-[var(--color-part-tenor-700)]',
  },
  BASS: {
    bg: 'bg-[var(--color-part-bass-50)]',
    border: 'border-[var(--color-part-bass-200)]',
    label: 'text-[var(--color-part-bass-600)]',
    count: 'text-[var(--color-part-bass-700)]',
  },
};

/** 개별 예배 출석 요약 섹션 */
function ServiceAttendanceSection({
  summary,
  showLabel,
  nextServiceDate,
}: {
  summary: AttendanceSummaryItem;
  showLabel: boolean;
  nextServiceDate: string;
}) {
  const { availableCount, unavailableCount, byPart, serviceType } = summary;

  return (
    <div className="space-y-3">
      {showLabel && (
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-[var(--color-border-subtle)]" />
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
            {serviceType}
          </span>
          <div className="h-px flex-1 bg-[var(--color-border-subtle)]" />
        </div>
      )}

      {/* 전체 요약 */}
      <div className="rounded-lg bg-[var(--color-background-tertiary)] p-4">
        {!showLabel && (
          <div className="text-sm text-[var(--color-text-secondary)]">
            {formatDisplayDate(nextServiceDate)} 기준
          </div>
        )}
        {showLabel && (
          <div className="text-sm text-[var(--color-text-secondary)]">
            {formatDisplayDate(nextServiceDate)} 기준
          </div>
        )}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[var(--color-primary-600)]">
            {availableCount}명
          </span>
          <span className="text-sm text-[var(--color-text-secondary)]">출석 가능</span>
        </div>

        {/* 상세 통계 */}
        <div className="mt-3 text-sm">
          <span className="text-[var(--color-text-tertiary)]">불참: </span>
          <span className="font-medium text-[var(--color-text-secondary)]">
            {unavailableCount}명
          </span>
        </div>
      </div>

      {/* 파트별 현황 */}
      <div className="grid grid-cols-4 gap-2">
        {byPart
          .filter((p) => PART_LABELS[p.part])
          .map((part) => {
            const colors = PART_CARD_COLORS[part.part];
            const hasSaved = !!part.lastUpdatedAt;
            const tooltip = hasSaved
              ? `파트장 마지막 저장: ${part.lastUpdatedAt}`
              : '이번 주 파트장 저장 이력 없음';
            return (
              <div
                key={part.part}
                className={`rounded-md border p-2 text-center ${colors?.bg ?? ''} ${colors?.border ?? 'border-[var(--color-border-subtle)]'}`}
              >
                <div className={`text-xs font-semibold ${colors?.label ?? 'text-[var(--color-text-tertiary)]'}`}>
                  {PART_LABELS[part.part]}
                </div>
                <div className={`mt-1 text-lg font-semibold ${colors?.count ?? 'text-[var(--color-text-primary)]'}`}>
                  {part.available}
                  <span className="text-sm font-normal text-[var(--color-text-tertiary)]">
                    /{part.total}
                  </span>
                </div>
                <div
                  className="mt-1 flex items-center justify-center gap-1 text-[10px] leading-tight"
                  title={tooltip}
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${getRecencyDotClass(part.lastUpdatedAt)}`}
                  />
                  {hasSaved ? (
                    <span className="font-semibold text-[var(--color-text-secondary)]">
                      {formatLastUpdated(part.lastUpdatedAt)} 저장됨
                    </span>
                  ) : (
                    <span className="font-semibold text-[var(--color-warning-700)]">미입력</span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/**
 * 출석 현황 요약 카드 (지휘자용)
 *
 * 다음 주일 출석 현황을 예배별, 파트별로 요약합니다.
 * 같은 날에 여러 예배가 있으면 각각 독립적으로 표시합니다.
 */
export function AttendanceSummaryCard({ nextServiceDate, summaries }: AttendanceSummaryCardProps) {
  const showLabels = summaries.length > 1;
  const mounted = useMounted();
  const { hasRole } = useAuth();
  // 권한 상태는 클라이언트에서만 채워지므로 마운트 후에만 버튼 렌더 (hydration mismatch 방지)
  const canSendReminder = mounted && hasRole([...MANUAL_NOTIFY_ROLES]);

  const [showReminderConfirm, setShowReminderConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSendReminder = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/notifications/vote-reminder', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || '독려 알림 발송에 실패했습니다.', handleSendReminder);
        return;
      }
      if (data.skipped) {
        showWarning(
          data.reason === 'deadline_passed'
            ? '출석 투표가 이미 마감되어 발송하지 않았습니다.'
            : '아직 투표하지 않은 대원이 없습니다.'
        );
        return;
      }
      showSuccess(`미투표 대원 ${data.targets}명에게 독려 알림을 보냈습니다.`);
    } catch {
      showError('독려 알림 발송에 실패했습니다.', handleSendReminder);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-[var(--color-primary-500)]" />
          이번 주 출석 현황
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaries.map((summary, index) => (
          <ServiceAttendanceSection
            key={summary.serviceScheduleId ?? index}
            summary={summary}
            showLabel={showLabels}
            nextServiceDate={nextServiceDate}
          />
        ))}

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/attendances">출석 관리</Link>
          </Button>
          {canSendReminder && (
            <Button
              variant="outline"
              className="flex-1"
              disabled={isSending}
              onClick={() => setShowReminderConfirm(true)}
            >
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="mr-2 h-4 w-4" />
              )}
              미투표자 독려
            </Button>
          )}
        </div>

        <ConfirmDialog
          open={showReminderConfirm}
          onOpenChange={setShowReminderConfirm}
          title="투표 독려 알림 발송"
          description="아직 출석 투표를 하지 않은 대원들에게 독려 알림을 보낼까요?"
          confirmLabel="발송"
          onConfirm={handleSendReminder}
        />
      </CardContent>
    </Card>
  );
}

export default AttendanceSummaryCard;
