'use client';

import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'DeadlineStatusBar' });
import { Check, Lock, Unlock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DeadlinesResponse,
  useCloseAttendance,
  useReopenAttendance,
  areAllPartsClosed,
} from '@/hooks/useAttendanceDeadlines';

type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';

interface DeadlineStatusBarProps {
  date: string;
  deadlines: DeadlinesResponse | undefined;
  isLoading?: boolean;
  userRole?: string;
  userPart?: Part | null;
  onRefetch?: () => void;
}

// 파트별 표시 정보
const PART_DISPLAY: Record<Part, { label: string; abbr: string; color: string }> = {
  SOPRANO: { label: '소프라노', abbr: 'S', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  ALTO: { label: '알토', abbr: 'A', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  TENOR: { label: '테너', abbr: 'T', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  BASS: { label: '베이스', abbr: 'B', color: 'bg-green-100 text-green-700 border-green-300' },
  SPECIAL: { label: '특별', abbr: 'SP', color: 'bg-gray-100 text-gray-700 border-gray-300' },
};

const PARTS: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];

/**
 * 출석 마감 현황 바
 * - 파트별 마감 상태 표시 (체크 표시)
 * - 전체 마감 상태 표시
 * - 전체 마감 버튼 (CONDUCTOR/ADMIN만, 모든 파트 마감 시 활성화)
 */
export default function DeadlineStatusBar({
  date,
  deadlines,
  isLoading,
  userRole,
  userPart,
  onRefetch,
}: DeadlineStatusBarProps) {
  const closeMutation = useCloseAttendance();
  const reopenMutation = useReopenAttendance();

  const isFullyClosed = deadlines?.isFullyClosed || false;
  const allPartsClosed = areAllPartsClosed(deadlines);
  const canManageFullDeadline = ['ADMIN', 'CONDUCTOR'].includes(userRole || '');
  const canCloseOwnPart = userRole === 'PART_LEADER' && userPart;
  const canCloseAnyPart = ['ADMIN', 'CONDUCTOR', 'MANAGER'].includes(userRole || '');

  // 파트 마감 처리
  const handlePartClose = async (part: Part) => {
    try {
      await closeMutation.mutateAsync({ date, part });
      onRefetch?.();
    } catch (error) {
      logger.error('Part close error:', error);
    }
  };

  // 전체 마감 처리
  const handleFullClose = async () => {
    try {
      await closeMutation.mutateAsync({ date, part: null });
      onRefetch?.();
    } catch (error) {
      logger.error('Full close error:', error);
    }
  };

  // 마감 해제 처리
  const handleReopen = async (deadlineId: string) => {
    try {
      await reopenMutation.mutateAsync({ id: deadlineId, date });
      onRefetch?.();
    } catch (error) {
      logger.error('Reopen error:', error);
      // 자리배치표가 존재하는 경우 등 사용자에게 에러 메시지 표시
      const errorMessage = error instanceof Error ? error.message : '마감 해제에 실패했습니다';
      alert(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-6 w-24 bg-gray-200 rounded" />
        <div className="flex gap-1">
          {PARTS.map((part) => (
            <div key={part} className="h-6 w-8 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border",
        isFullyClosed
          ? "bg-[var(--color-error-50)] border-[var(--color-error-200)]"
          : "bg-[var(--color-surface)] border-[var(--color-border-default)]"
      )}
    >
      {/* 마감 현황 제목 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isFullyClosed ? (
          <Lock className="w-4 h-4 text-[var(--color-error-600)]" />
        ) : (
          <Unlock className="w-4 h-4 text-[var(--color-text-tertiary)]" />
        )}
        <span className={cn(
          "text-sm font-medium",
          isFullyClosed ? "text-[var(--color-error-700)]" : "text-[var(--color-text-secondary)]"
        )}>
          {isFullyClosed ? '전체 마감됨' : '마감 현황'}
        </span>
      </div>

      {/* 파트별 마감 상태 칩 */}
      <div className="flex flex-wrap gap-1.5">
        {PARTS.map((part) => {
          const isClosed = deadlines?.partDeadlines?.[part] !== null;
          const deadline = deadlines?.partDeadlines?.[part];
          const canClose = canCloseAnyPart || (canCloseOwnPart && userPart === part);
          const isProcessing = closeMutation.isPending || reopenMutation.isPending;

          return (
            <button
              key={part}
              type="button"
              onClick={() => {
                if (!isClosed && canClose && !isFullyClosed) {
                  handlePartClose(part);
                }
              }}
              disabled={isFullyClosed || isProcessing || (!isClosed && !canClose)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border",
                "transition-all duration-150",
                isClosed
                  ? "bg-[var(--color-success-100)] text-[var(--color-success-700)] border-[var(--color-success-300)]"
                  : PART_DISPLAY[part].color,
                !isFullyClosed && canClose && !isClosed && "hover:opacity-80 cursor-pointer",
                (isFullyClosed || (!canClose && !isClosed)) && "opacity-50 cursor-not-allowed"
              )}
              title={isClosed
                ? `${PART_DISPLAY[part].label} 체크 완료`
                : canClose
                  ? `${PART_DISPLAY[part].label} 체크 완료로 변경`
                  : `${PART_DISPLAY[part].label}`}
            >
              <span>{PART_DISPLAY[part].abbr}</span>
              {isClosed && <Check className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* 전체 마감 버튼 */}
      {canManageFullDeadline && (
        <div className="flex items-center gap-2 sm:ml-auto">
          {isFullyClosed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (deadlines?.fullDeadline?.id) {
                  handleReopen(deadlines.fullDeadline.id);
                }
              }}
              disabled={reopenMutation.isPending}
              className="text-xs"
            >
              <Unlock className="w-3.5 h-3.5 mr-1" />
              마감 해제
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleFullClose}
              disabled={!allPartsClosed || closeMutation.isPending}
              className={cn(
                "text-xs",
                !allPartsClosed && "opacity-50"
              )}
              title={!allPartsClosed ? '모든 파트가 체크 완료되어야 전체 마감할 수 있습니다' : '전체 마감하기'}
            >
              <Lock className="w-3.5 h-3.5 mr-1" />
              전체 마감
            </Button>
          )}
        </div>
      )}

      {/* 전체 마감 안내 메시지 */}
      {isFullyClosed && !canManageFullDeadline && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-error-600)] sm:ml-auto">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>수정 불가 (CONDUCTOR에게 문의)</span>
        </div>
      )}
    </div>
  );
}
