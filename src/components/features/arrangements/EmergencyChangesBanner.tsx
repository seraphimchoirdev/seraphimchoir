'use client';

import { useState, memo } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Clock, UserMinus, UserPlus } from 'lucide-react';
import { useArrangementStore } from '@/store/arrangement-store';
import { cn } from '@/lib/utils';

/**
 * 긴급 변동 요약 배너
 *
 * 공유 후 변동이 있을 때만 ArrangementHeader 하단에 표시됩니다.
 * 클릭하면 변동 이력이 펼쳐집니다.
 */
const EmergencyChangesBanner = memo(function EmergencyChangesBanner() {
    const [isExpanded, setIsExpanded] = useState(false);

    // Store에서 변동 이력 가져오기
    const changes = useArrangementStore((state) => state.emergencyChanges.changes);
    const sharedSnapshot = useArrangementStore((state) => state.emergencyChanges.sharedSnapshot);

    // 변동이 없거나 스냅샷이 없으면 렌더링하지 않음
    if (!sharedSnapshot || changes.length === 0) {
        return null;
    }

    // 변동 유형별 카운트
    const unavailableCount = changes.filter((c) => c.type === 'UNAVAILABLE').length;
    const availableCount = changes.filter((c) => c.type === 'AVAILABLE').length;

    // 시간 포맷팅 (HH:mm)
    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
            {/* 배너 헤더 (항상 표시) */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        공유 후 {changes.length}건의 변동이 있습니다
                    </span>
                    <div className="flex items-center gap-2">
                        {unavailableCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-xs text-red-700 dark:text-red-300">
                                <UserMinus className="h-3 w-3" />
                                {unavailableCount}명 제거
                            </span>
                        )}
                        {availableCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-xs text-emerald-700 dark:text-emerald-300">
                                <UserPlus className="h-3 w-3" />
                                {availableCount}명 추가
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <span className="text-xs">변동 내역</span>
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </div>
            </button>

            {/* 변동 이력 목록 (펼쳐졌을 때) */}
            {isExpanded && (
                <div className="px-4 pb-3 space-y-1.5 border-t border-amber-200 dark:border-amber-800 pt-2">
                    {changes.map((change, idx) => (
                        <div
                            key={change.id}
                            className={cn(
                                'flex items-center gap-3 text-sm py-1.5 px-3 rounded-md',
                                change.type === 'UNAVAILABLE'
                                    ? 'bg-red-50 dark:bg-red-950/30'
                                    : 'bg-emerald-50 dark:bg-emerald-950/30'
                            )}
                        >
                            {/* 시간 */}
                            <span className="flex items-center gap-1 text-xs text-muted-foreground min-w-[60px]">
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
                            <span className={cn(
                                'flex-1',
                                change.type === 'UNAVAILABLE'
                                    ? 'text-red-700 dark:text-red-300'
                                    : 'text-emerald-700 dark:text-emerald-300'
                            )}>
                                <strong>{change.memberName}</strong>
                                <span className="text-xs ml-1 opacity-75">({change.part.charAt(0)})</span>
                                {change.type === 'UNAVAILABLE' ? (
                                    change.removedFrom && (
                                        <span className="ml-2 text-xs opacity-75">
                                            {change.removedFrom.row}행 {change.removedFrom.col}열에서 제거
                                        </span>
                                    )
                                ) : (
                                    change.addedTo && (
                                        <span className="ml-2 text-xs opacity-75">
                                            {change.addedTo.row}행 {change.addedTo.col}열에 배치
                                        </span>
                                    )
                                )}
                            </span>

                            {/* 이동 인원 */}
                            {change.movedMemberCount > 0 && (
                                <span className="text-xs text-amber-600 dark:text-amber-400">
                                    ({change.movedMemberCount}명 이동)
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default EmergencyChangesBanner;
