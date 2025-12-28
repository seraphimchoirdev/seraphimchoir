
'use client';

import { useArrangementStore } from '@/store/arrangement-store';
import type { Database } from '@/types/database.types';
import { cn } from '@/lib/utils';

type Part = Database['public']['Enums']['part'];

interface SeatSlotProps {
    row: number;
    col: number;
}

export default function SeatSlot({ row, col }: SeatSlotProps) {
    const {
        assignments,
        selectedMemberId,
        selectedSource,
        selectedPosition,
        handleSeatClick,
        removeMember,
    } = useArrangementStore();

    const assignment = assignments[`${row}-${col}`];
    const isOccupied = !!assignment;

    // Check if this seat is the selected one (from grid)
    const isSelectedSeat =
        selectedSource === 'grid' &&
        selectedPosition?.row === row &&
        selectedPosition?.col === col;

    // Determine visual feedback based on state
    const hasSelection = !!selectedMemberId;
    const isTargetSeat = hasSelection && !isSelectedSeat;

    // Double click handler to remove member
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (assignment) {
            removeMember(row, col);
        }
    };

    return (
        <button
            type="button"
            onClick={() => handleSeatClick(row, col)}
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
                    memberId={assignment.memberId}
                    name={assignment.memberName}
                    part={assignment.part}
                    row={row}
                    col={col}
                    isSelected={isSelectedSeat}
                />
            ) : (
                <div className="text-[10px] sm:text-xs text-gray-300 pointer-events-none">빈 좌석</div>
            )}
        </button>
    );
}

// Internal component for Grid Clickable Member
function GridClickableMember({
    memberId,
    name,
    part,
    row,
    col,
    isSelected,
}: {
    memberId: string;
    name: string;
    part: Part;
    row: number;
    col: number;
    isSelected: boolean;
}) {
    // Part color mapping
    const getPartColor = (p: Part) => {
        switch (p) {
            case 'SOPRANO':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'ALTO':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'TENOR':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'BASS':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div
            className={cn(
                'w-full h-full flex flex-col items-center justify-center rounded-md border shadow-sm',
                'pointer-events-none', // Parent button handles all clicks
                'touch-manipulation transition-all duration-200',
                getPartColor(part),
            )}
            title="더블 클릭하여 제거"
            role="presentation"
            aria-label={`${name} - ${part} 파트, ${row + 1}행 ${col + 1}열 배치됨`}
        >
            <span className="font-bold text-[10px] sm:text-xs lg:text-sm text-center leading-tight px-0.5 truncate max-w-full">
                {name}
            </span>
        </div>
    );
}
