
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
                !isOccupied && !hasSelection && 'bg-white border-dashed border-gray-300',
                // Empty seat, with selection (valid target)
                !isOccupied && hasSelection && 'bg-green-50 border-solid border-green-400 border-2 animate-pulse',
                // Occupied seat, with selection (swappable)
                isOccupied && hasSelection && !isSelectedSeat && 'bg-blue-50 border-solid border-blue-400 border-2',
                // This seat is selected (from grid)
                isSelectedSeat && 'ring-2 ring-primary-500 ring-offset-1',
                // Normal occupied seat
                isOccupied && !hasSelection && 'bg-white border-solid border-gray-300',
            )}
            role="button"
            aria-label={`좌석 ${row + 1}행 ${col + 1}열${assignment ? ` - ${assignment.memberName} 배치됨` : ''}`}
            aria-pressed={isSelectedSeat}
        >
            <span className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 text-[9px] sm:text-[10px] text-gray-400 pointer-events-none">
                {row + 1}-{col + 1}
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
                <div className="text-[10px] sm:text-xs text-gray-300 pointer-events-none">빈 좌석</div>
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
    // Part color mapping - 악보 스티커 색상 기준
    const getPartColor = (p: Part) => {
        switch (p) {
            case 'SOPRANO':
                return 'bg-orange-600 text-white border-orange-700';  // 오렌지
            case 'ALTO':
                return 'bg-amber-500 text-white border-amber-600';    // 앰버
            case 'TENOR':
                return 'bg-sky-600 text-white border-sky-700';        // 스카이
            case 'BASS':
                return 'bg-green-600 text-white border-green-700';    // 그린
            default:
                return 'bg-gray-500 text-white border-gray-600';
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
                isRowLeader && 'ring-2 ring-orange-500 ring-offset-1',
                // 줄반장 지정 모드일 때 호버 효과
                rowLeaderMode && 'cursor-pointer',
            )}
            title={isRowLeader ? "줄반장 (클릭하여 해제)" : (rowLeaderMode ? "클릭하여 줄반장 지정" : "더블 클릭하여 제거")}
            role="presentation"
            aria-label={`${name} - ${part} 파트, ${row + 1}행 ${col + 1}열 배치됨${isRowLeader ? ' (줄반장)' : ''}`}
        >
            <span className="font-bold text-xs sm:text-sm lg:text-base text-center leading-tight px-0.5 truncate max-w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
                {name}
            </span>
            {/* 줄반장 아이콘 표시 */}
            {isRowLeader && (
                <Crown className="absolute -top-1 -right-1 w-4 h-4 text-orange-500" />
            )}
        </div>
    );
});
