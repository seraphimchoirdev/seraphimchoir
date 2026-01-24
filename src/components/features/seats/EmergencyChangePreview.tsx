'use client';

import { memo } from 'react';
import { ArrowRight, Minus, Plus, MoveHorizontal, Check, AlertTriangle } from 'lucide-react';
import type { EmergencyChangePreview as PreviewType, CascadeChangeStep } from '@/types/emergency-changes';
import { cn } from '@/lib/utils';

interface EmergencyChangePreviewProps {
    /** 미리보기 데이터 */
    preview: PreviewType | null;
    /** 처리 방식 라벨 */
    modeLabel: string;
    /** 컴팩트 모드 (다이얼로그 내 좁은 공간용) */
    compact?: boolean;
}

/**
 * 긴급 변동 미리보기 컴포넌트
 *
 * 연쇄 변동 목록과 이동 인원 수를 시각적으로 표시합니다.
 */
const EmergencyChangePreview = memo(function EmergencyChangePreview({
    preview,
    modeLabel,
    compact = false,
}: EmergencyChangePreviewProps) {
    if (!preview) {
        return (
            <div className="text-sm text-muted-foreground">
                미리보기를 계산하는 중...
            </div>
        );
    }

    const { cascadeChanges, movedMemberCount, gridLayoutChanges } = preview;

    return (
        <div className={cn('space-y-3', compact && 'space-y-2')}>
            {/* 변동 목록 */}
            <div className="space-y-1.5">
                {cascadeChanges.map((change, idx) => (
                    <CascadeChangeItem key={idx} change={change} compact={compact} />
                ))}
            </div>

            {/* 그리드 용량 변경 */}
            {gridLayoutChanges.rowCapacityChanges.length > 0 && (
                <div className="space-y-1">
                    {gridLayoutChanges.rowCapacityChanges.map((change, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                'flex items-center gap-2 text-sm',
                                compact ? 'text-xs' : 'text-sm'
                            )}
                        >
                            <span className="text-muted-foreground">•</span>
                            <span>
                                {change.row}행 용량: {change.before}석
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className={cn(
                                change.after < change.before ? 'text-amber-600' : 'text-emerald-600',
                                'font-medium'
                            )}>
                                {change.after}석
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* 이동 인원 요약 */}
            <div className={cn(
                'flex items-center gap-2 pt-2 border-t border-border',
                compact ? 'pt-1.5' : 'pt-2'
            )}>
                {movedMemberCount === 0 ? (
                    <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span className={cn(
                            'text-emerald-600 font-medium',
                            compact ? 'text-xs' : 'text-sm'
                        )}>
                            이동 인원: 0명
                        </span>
                    </>
                ) : (
                    <>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className={cn(
                            'text-amber-600 font-medium',
                            compact ? 'text-xs' : 'text-sm'
                        )}>
                            이동 인원: {movedMemberCount}명
                        </span>
                    </>
                )}
            </div>
        </div>
    );
});

/**
 * 개별 연쇄 변동 항목
 */
const CascadeChangeItem = memo(function CascadeChangeItem({
    change,
    compact,
}: {
    change: CascadeChangeStep;
    compact?: boolean;
}) {
    const getIcon = () => {
        switch (change.type) {
            case 'REMOVE':
                return <Minus className="h-3.5 w-3.5 text-red-500" />;
            case 'MOVE':
                return <MoveHorizontal className="h-3.5 w-3.5 text-amber-500" />;
            case 'SHRINK':
                return <Minus className="h-3.5 w-3.5 text-amber-500" />;
            case 'EXPAND':
                return <Plus className="h-3.5 w-3.5 text-emerald-500" />;
            case 'ADD':
                return <Plus className="h-3.5 w-3.5 text-emerald-500" />;
            default:
                return null;
        }
    };

    const getTextColor = () => {
        switch (change.type) {
            case 'REMOVE':
                return 'text-red-700 dark:text-red-400';
            case 'MOVE':
                return 'text-amber-700 dark:text-amber-400';
            case 'SHRINK':
                return 'text-amber-700 dark:text-amber-400';
            case 'EXPAND':
                return 'text-emerald-700 dark:text-emerald-400';
            case 'ADD':
                return 'text-emerald-700 dark:text-emerald-400';
            default:
                return 'text-foreground';
        }
    };

    return (
        <div className={cn(
            'flex items-start gap-2',
            compact ? 'text-xs' : 'text-sm'
        )}>
            <span className="mt-0.5 flex-shrink-0">
                {getIcon()}
            </span>
            <span className={getTextColor()}>
                {change.description}
            </span>
        </div>
    );
});

export default EmergencyChangePreview;
