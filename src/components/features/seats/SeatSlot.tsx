
'use client';
'use memo';

import { memo, useCallback } from 'react';
import { Crown } from 'lucide-react';
import { useArrangementStore } from '@/store/arrangement-store';
import type { Database } from '@/types/database.types';
import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';

type Part = Database['public']['Enums']['part'];

interface SeatSlotProps {
    row: number;
    col: number;
}

// 메모이제이션된 SeatSlot 컴포넌트
const SeatSlot = memo(function SeatSlot({ row, col }: SeatSlotProps) {
    const seatKey = `${row}-${col}`;

    // 선택적 상태 구독 - 이 좌석과 관련된 상태만 구독
    const assignment = useArrangementStore((state) => state.assignments[seatKey]);
    const selectedMemberId = useArrangementStore((state) => state.selectedMemberId);
    const rowLeaderMode = useArrangementStore((state) => state.rowLeaderMode);

    // 선택된 위치가 이 좌석인지 확인 (shallow 비교)
    const isSelectedSeat = useArrangementStore(
        useShallow((state) =>
            state.selectedSource === 'grid' &&
            state.selectedPosition?.row === row &&
            state.selectedPosition?.col === col
        )
    );

    // 액션 함수들
    const handleSeatClickAction = useArrangementStore((state) => state.handleSeatClick);
    const removeMemberAction = useArrangementStore((state) => state.removeMember);
    const toggleRowLeaderAction = useArrangementStore((state) => state.toggleRowLeader);

    const isOccupied = !!assignment;

    // Determine visual feedback based on state
    const hasSelection = !!selectedMemberId;

    // Double click handler to remove member (메모이제이션)
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (assignment && !rowLeaderMode) {
            removeMemberAction(row, col);
        }
    }, [assignment, rowLeaderMode, removeMemberAction, row, col]);

    // Click handler - either toggle row leader or normal seat click (메모이제이션)
    const handleClick = useCallback(() => {
        if (rowLeaderMode && assignment) {
            toggleRowLeaderAction(row, col);
        } else {
            handleSeatClickAction(row, col);
        }
    }, [rowLeaderMode, assignment, toggleRowLeaderAction, handleSeatClickAction, row, col]);

    return (
        <button
            type="button"
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            className={cn(
                'w-[48px] h-[36px] sm:w-16 sm:h-12 lg:w-[72px] lg:h-[54px]',
                'border rounded-lg flex items-center justify-center p-0.5 sm:p-1',
                'relative transition-all duration-200 touch-manipulation',
                // Empty seat, no selection
                !isOccupied && !hasSelection && 'bg-[var(--color-background-primary)] border-dashed border-[var(--color-border-default)]',
                // Empty seat, with selection (valid target)
                !isOccupied && hasSelection && 'bg-[var(--color-success-50)] border-solid border-[var(--color-success-400)] border-2 animate-pulse',
                // Occupied seat, with selection (swappable)
                isOccupied && hasSelection && !isSelectedSeat && 'bg-[var(--color-primary-50)] border-solid border-[var(--color-primary-400)] border-2',
                // This seat is selected (from grid)
                isSelectedSeat && 'ring-2 ring-[var(--color-primary-500)] ring-offset-1',
                // Normal occupied seat
                isOccupied && !hasSelection && 'bg-[var(--color-background-primary)] border-solid border-[var(--color-border-default)]',
            )}
            role="button"
            aria-label={`좌석 ${row}행 ${col}열${assignment ? ` - ${assignment.memberName} 배치됨` : ''}`}
            aria-pressed={isSelectedSeat}
        >
            <span className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 text-[9px] sm:text-[10px] text-[var(--color-text-tertiary)] pointer-events-none">
                {row}-{col}
            </span>

            {assignment ? (
                <GridClickableMember
                    name={assignment.memberName}
                    part={assignment.part}
                    row={row}
                    col={col}
                    isRowLeader={assignment.isRowLeader}
                    rowLeaderMode={rowLeaderMode}
                />
            ) : (
                <div className="text-[10px] sm:text-xs text-[var(--color-text-disabled)] pointer-events-none">빈 좌석</div>
            )}
        </button>
    );
});

export default SeatSlot;

// Internal component for Grid Clickable Member (메모이제이션)
const GridClickableMember = memo(function GridClickableMember({
    name,
    part,
    row,
    col,
    isRowLeader,
    rowLeaderMode,
}: {
    name: string;
    part: Part;
    row: number;
    col: number;
    isRowLeader?: boolean;
    rowLeaderMode?: boolean;
}) {
    // Part color mapping - 악보 스티커 색상 기준 (CSS 변수 사용)
    const getPartColor = (p: Part) => {
        switch (p) {
            case 'SOPRANO':
                return 'bg-[var(--color-part-soprano-600)] text-white border-[var(--color-part-soprano-700)]';
            case 'ALTO':
                return 'bg-[var(--color-part-alto-500)] text-white border-[var(--color-part-alto-600)]';
            case 'TENOR':
                return 'bg-[var(--color-part-tenor-600)] text-white border-[var(--color-part-tenor-700)]';
            case 'BASS':
                return 'bg-[var(--color-part-bass-600)] text-white border-[var(--color-part-bass-700)]';
            default:
                return 'bg-[var(--color-part-special-500)] text-white border-[var(--color-part-special-600)]';
        }
    };

    return (
        <div
            className={cn(
                'w-full h-full flex flex-col items-center justify-center rounded-md border shadow-sm',
                'pointer-events-none', // Parent button handles all clicks
                'touch-manipulation transition-all duration-200',
                getPartColor(part),
                // 줄반장 표시: 오렌지 테두리 강조
                isRowLeader && 'ring-2 ring-[var(--color-part-soprano-500)] ring-offset-1',
                // 줄반장 지정 모드일 때 호버 효과
                rowLeaderMode && 'cursor-pointer',
            )}
            title={isRowLeader ? "줄반장 (클릭하여 해제)" : (rowLeaderMode ? "클릭하여 줄반장 지정" : "더블 클릭하여 제거")}
            role="presentation"
            aria-label={`${name} - ${part} 파트, ${row}행 ${col}열 배치됨${isRowLeader ? ' (줄반장)' : ''}`}
        >
            <span className="font-bold text-xs sm:text-sm lg:text-base text-center leading-tight px-0.5 truncate max-w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
                {name}
            </span>
            {/* 줄반장 아이콘 표시 */}
            {isRowLeader && (
                <Crown className="absolute -top-1 -right-1 w-4 h-4 text-[var(--color-part-soprano-500)]" />
            )}
        </div>
    );
});
