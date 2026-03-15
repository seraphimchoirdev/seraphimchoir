'use client';

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Undo2,
  UserMinus,
  UserPlus,
} from 'lucide-react';

import { memo, useState } from 'react';

import { useEmergencyUndo } from '@/hooks/useEmergencyUndo';

import { showError, showSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';

import { useArrangementStore } from '@/store/arrangement-store';

interface EmergencyChangesBannerProps {
  arrangementId: string;
  date: string;
  serviceScheduleId?: string;
  /** 인라인 모드: EmergencyEditPanel 내부에서 사용 시 배경/테두리 없이 렌더링 */
  inline?: boolean;
}

/**
 * 긴급 변동 요약 배너
 *
 * 공유 후 변동이 있을 때만 ArrangementHeader 하단에 표시됩니다.
 * 클릭하면 변동 이력이 펼쳐집니다.
 * 마지막 1건 되돌리기 기능 포함.
 */
const EmergencyChangesBanner = memo(function EmergencyChangesBanner({
  arrangementId,
  date,
  serviceScheduleId,
  inline = false,
}: EmergencyChangesBannerProps) {
  const [isExpanded, setIsExpanded] = useState(inline); // 인라인 모드에서는 기본 펼침

  // Store에서 변동 이력 가져오기
  const changes = useArrangementStore((state) => state.emergencyChanges.changes);
  const sharedSnapshot = useArrangementStore((state) => state.emergencyChanges.sharedSnapshot);

  // 되돌리기 훅
  const { handleUndo, canUndo, isLoading: isUndoing } = useEmergencyUndo({
    arrangementId,
    date,
    serviceScheduleId,
    onSuccess: (message) => showSuccess(message),
    onError: (message) => showError(message),
  });

  // 변동이 없거나 스냅샷이 없으면 렌더링하지 않음
  if (!sharedSnapshot || changes.length === 0) {
    return null;
  }

  // 변동 유형별 카운트
  const unavailableCount = changes.filter((c) => c.type === 'UNAVAILABLE').length;
  const availableCount = changes.filter((c) => c.type === 'AVAILABLE').length;

  // 시간 포맷팅 (HH:mm)
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  // 되돌리기 버튼 클릭 (이벤트 전파 방지)
  const handleUndoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleUndo();
  };

  // 인라인 모드: 변동 목록만 직접 표시 (배너 스타일 제거)
  if (inline) {
    return (
      <div className="space-y-1.5">
        {changes.map((change, idx) => (
          <div
            key={change.id}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm',
              change.type === 'UNAVAILABLE'
                ? 'bg-red-50 dark:bg-red-950/30'
                : 'bg-emerald-50 dark:bg-emerald-950/30'
            )}
          >
            <span className="text-muted-foreground flex min-w-[60px] items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {formatTime(change.timestamp)}
            </span>
            {change.type === 'UNAVAILABLE' ? (
              <UserMinus className="h-4 w-4 text-red-600 dark:text-red-400" />
            ) : (
              <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span
              className={cn(
                'flex-1',
                change.type === 'UNAVAILABLE'
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              )}
            >
              <strong>{change.memberName}</strong>
              <span className="ml-1 text-xs opacity-75">({change.part.charAt(0)})</span>
              {change.type === 'UNAVAILABLE'
                ? change.removedFrom && (
                    <span className="ml-2 text-xs opacity-75">
                      {change.removedFrom.row}행 {change.removedFrom.col}열에서 제거
                    </span>
                  )
                : change.addedTo && (
                    <span className="ml-2 text-xs opacity-75">
                      {change.addedTo.row}행 {change.addedTo.col}열에 배치
                    </span>
                  )}
            </span>
            {change.movedMemberCount > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                ({change.movedMemberCount}명 이동)
              </span>
            )}
            {idx === changes.length - 1 && canUndo && (
              <button
                type="button"
                onClick={handleUndoClick}
                disabled={isUndoing}
                className="ml-1 rounded-md p-1 text-amber-600 transition-colors hover:bg-amber-200 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-800"
                title="되돌리기"
              >
                {isUndoing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Undo2 className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      {/* 배너 헤더 (항상 표시) — div로 래핑하여 내부 button 중첩 방지 */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-2 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/30"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            공유 후 {changes.length}건의 변동이 있습니다
          </span>
          <div className="flex items-center gap-2">
            {unavailableCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/50 dark:text-red-300">
                <UserMinus className="h-3 w-3" />
                {unavailableCount}명 제거
              </span>
            )}
            {availableCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                <UserPlus className="h-3 w-3" />
                {availableCount}명 추가
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 되돌리기 버튼 (접힌 상태에서 표시) */}
          {canUndo && !isExpanded && (
            <button
              type="button"
              onClick={handleUndoClick}
              disabled={isUndoing}
              className="rounded-md p-1 text-amber-600 transition-colors hover:bg-amber-200 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-800"
              title="마지막 변동 되돌리기"
            >
              {isUndoing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4" />
              )}
            </button>
          )}
          <span className="text-xs text-amber-600 dark:text-amber-400">변동 내역</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          )}
        </div>
      </div>

      {/* 변동 이력 목록 (펼쳐졌을 때) */}
      {isExpanded && (
        <div className="space-y-1.5 border-t border-amber-200 px-4 pt-2 pb-3 dark:border-amber-800">
          {changes.map((change, idx) => (
            <div
              key={change.id}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm',
                change.type === 'UNAVAILABLE'
                  ? 'bg-red-50 dark:bg-red-950/30'
                  : 'bg-emerald-50 dark:bg-emerald-950/30'
              )}
            >
              {/* 시간 */}
              <span className="text-muted-foreground flex min-w-[60px] items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {formatTime(change.timestamp)}
              </span>

              {/* 아이콘 */}
              {change.type === 'UNAVAILABLE' ? (
                <UserMinus className="h-4 w-4 text-red-600 dark:text-red-400" />
              ) : (
                <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}

              {/* 내용 */}
              <span
                className={cn(
                  'flex-1',
                  change.type === 'UNAVAILABLE'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-emerald-700 dark:text-emerald-300'
                )}
              >
                <strong>{change.memberName}</strong>
                <span className="ml-1 text-xs opacity-75">({change.part.charAt(0)})</span>
                {change.type === 'UNAVAILABLE'
                  ? change.removedFrom && (
                      <span className="ml-2 text-xs opacity-75">
                        {change.removedFrom.row}행 {change.removedFrom.col}열에서 제거
                      </span>
                    )
                  : change.addedTo && (
                      <span className="ml-2 text-xs opacity-75">
                        {change.addedTo.row}행 {change.addedTo.col}열에 배치
                      </span>
                    )}
              </span>

              {/* 이동 인원 */}
              {change.movedMemberCount > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  ({change.movedMemberCount}명 이동)
                </span>
              )}

              {/* 마지막 항목에만 되돌리기 버튼 표시 */}
              {idx === changes.length - 1 && canUndo && (
                <button
                  type="button"
                  onClick={handleUndoClick}
                  disabled={isUndoing}
                  className="ml-1 rounded-md p-1 text-amber-600 transition-colors hover:bg-amber-200 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-800"
                  title="되돌리기"
                >
                  {isUndoing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Undo2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default EmergencyChangesBanner;
