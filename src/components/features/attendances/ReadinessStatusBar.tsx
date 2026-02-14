'use client';

import { useRef } from 'react';

import { Check, Circle, ClipboardCheck } from 'lucide-react';

import {
  type AttendanceDeadline,
  type DeadlinesResponse,
  READINESS_PARTS,
  getReadyPartsCount,
  useToggleReadiness,
} from '@/hooks/useAttendanceDeadlines';

import { createLogger } from '@/lib/logger';
import { showError, showSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';

const logger = createLogger({ prefix: 'ReadinessStatusBar' });

type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';

interface ReadinessStatusBarProps {
  date: string;
  deadlines: DeadlinesResponse | undefined;
  isLoading?: boolean;
  userRole?: string;
  userPart?: Part | null;
}

// 파트별 표시 정보
const PART_DISPLAY: Record<string, { label: string; abbr: string }> = {
  SOPRANO: { label: '소프라노', abbr: '소프' },
  ALTO: { label: '알토', abbr: '알토' },
  TENOR: { label: '테너', abbr: '테너' },
  BASS: { label: '베이스', abbr: '베이스' },
};

/**
 * 파트별 준비 완료 현황 바
 * - 파트 칩 클릭으로 준비 완료 토글
 * - PART_LEADER는 본인 파트만, CONDUCTOR/ADMIN은 모든 파트
 * - SPECIAL 파트는 표시하지 않음
 */
export default function ReadinessStatusBar({
  date,
  deadlines,
  isLoading,
  userRole,
  userPart,
}: ReadinessStatusBarProps) {
  const { toggleReadiness, isPending } = useToggleReadiness();
  const isProcessingRef = useRef(false);

  const readyCount = getReadyPartsCount(deadlines);
  const totalCount = READINESS_PARTS.length;
  const allReady = readyCount === totalCount;

  const canToggleAnyPart = ['ADMIN', 'CONDUCTOR', 'MANAGER'].includes(userRole || '');
  const canToggleOwnPart = userRole === 'PART_LEADER' && userPart;

  const handleToggle = async (part: Part, currentDeadline: AttendanceDeadline | null) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      await toggleReadiness({ date, part, currentDeadline });
      if (currentDeadline) {
        showSuccess(`${PART_DISPLAY[part]?.label || part} 준비 완료 해제`);
      } else {
        showSuccess(`${PART_DISPLAY[part]?.label || part} 준비 완료!`);
      }
    } catch (error) {
      logger.error('Toggle readiness error:', error);
      const errorMessage = error instanceof Error ? error.message : '준비 완료 처리에 실패했습니다';
      showError(errorMessage);
    } finally {
      isProcessingRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex animate-pulse items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="h-5 w-5 rounded bg-gray-200" />
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="flex gap-2">
          {READINESS_PARTS.map((part) => (
            <div key={part} className="h-8 w-14 rounded-full bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-4 shadow-sm transition-colors',
        allReady
          ? 'border-[var(--color-success-200)] bg-[var(--color-success-50)]'
          : 'border-[var(--color-border-default)] bg-white'
      )}
    >
      {/* 헤더 행 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck
            className={cn(
              'h-4.5 w-4.5',
              allReady ? 'text-[var(--color-success-600)]' : 'text-[var(--color-text-tertiary)]'
            )}
          />
          <span
            className={cn(
              'text-sm font-semibold',
              allReady ? 'text-[var(--color-success-700)]' : 'text-[var(--color-text-primary)]'
            )}
          >
            파트별 준비 현황
          </span>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-bold',
            allReady
              ? 'bg-[var(--color-success-100)] text-[var(--color-success-700)]'
              : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)]'
          )}
        >
          {readyCount}/{totalCount}
        </span>
      </div>

      {/* 파트 칩 목록 */}
      <div className="flex flex-wrap gap-2">
        {READINESS_PARTS.map((part) => {
          const deadline = deadlines?.partDeadlines?.[part] ?? null;
          const isReady = deadline !== null;
          const canToggle = canToggleAnyPart || (canToggleOwnPart && userPart === part);
          const isDisabled = isPending || !canToggle;

          return (
            <button
              key={part}
              type="button"
              onClick={() => {
                if (!isDisabled) {
                  handleToggle(part, deadline);
                }
              }}
              disabled={isDisabled}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold',
                'transition-all duration-150',
                isReady
                  ? 'border-[var(--color-success-400)] bg-[var(--color-success-100)] text-[var(--color-success-700)]'
                  : 'border-[var(--color-border-default)] bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)]',
                canToggle && !isPending && 'cursor-pointer hover:shadow-sm active:scale-95',
                canToggle && !isPending && !isReady && 'hover:border-[var(--color-success-300)] hover:bg-[var(--color-success-50)]',
                canToggle && !isPending && isReady && 'hover:border-[var(--color-warning-300)] hover:bg-[var(--color-warning-50)]',
                isDisabled && 'cursor-default opacity-60'
              )}
              title={
                isReady
                  ? canToggle
                    ? `${PART_DISPLAY[part]?.label} 준비 완료 (클릭하여 해제)`
                    : `${PART_DISPLAY[part]?.label} 준비 완료`
                  : canToggle
                    ? `${PART_DISPLAY[part]?.label} 준비 완료로 표시`
                    : `${PART_DISPLAY[part]?.label}`
              }
            >
              {isReady ? (
                <Check className="h-4 w-4" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              <span>{PART_DISPLAY[part]?.abbr || part}</span>
            </button>
          );
        })}
      </div>

      {/* 도움말 */}
      <div className="mt-3 space-y-0.5 text-xs">
        <p className="text-[var(--color-text-secondary)]">자리배치표 생성 이전까지 준비 완료 해제 후 출석 수정이 가능합니다.</p>
        <p className="text-[var(--color-warning-600)]">자리배치표 생성 이후에 출석 수정은 불가합니다. 지휘자에게 별도 보고해주세요.</p>
      </div>
    </div>
  );
}
