
'use client';
'use memo';

import { memo, useCallback } from 'react';
import { Crown } from 'lucide-react';
import { useArrangementStore } from '@/store/arrangement-store';
import type { Database } from '@/types/database.types';
import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';
import SeatContextMenu from './SeatContextMenu';

type Part = Database['public']['Enums']['part'];

interface SeatSlotProps {
    row: number;
    col: number;
    onEmergencyUnavailable?: (params: {
        memberId: string;
        memberName: string;
        part: Part;  // 파트 정보 (파트 영역 고려를 위해 필수)
        row: number;
        col: number;
    }) => void;
    isReadOnly?: boolean;
    /** 긴급 수정 모드 (SHARED 상태에서만 true) - 컨텍스트 메뉴 표시 조건 */
    isEmergencyMode?: boolean;
}

// 메모이제이션된 SeatSlot 컴포넌트
const SeatSlot = memo(function SeatSlot({
    row,
    col,
    onEmergencyUnavailable,
    isReadOnly = false,
    isEmergencyMode = false,
}: SeatSlotProps) {
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

    // 컨텍스트 메뉴: 좌석에서 제거
    const handleRemoveFromSeat = useCallback(() => {
        if (assignment) {
            removeMemberAction(row, col);
        }
    }, [assignment, removeMemberAction, row, col]);

    // 컨텍스트 메뉴: 긴급 등단 불가 처리
    const handleEmergencyUnavailable = useCallback(() => {
        if (assignment && onEmergencyUnavailable) {
            onEmergencyUnavailable({
                memberId: assignment.memberId,
                memberName: assignment.memberName,
                part: assignment.part,  // 파트 정보 전달 (파트 영역 고려를 위해 필수)
                row,
                col,
            });
        }
    }, [assignment, onEmergencyUnavailable, row, col]);

    return (
        <SeatContextMenu
            isOccupied={isOccupied}
            memberName={assignment?.memberName}
            memberId={assignment?.memberId}
            onRemoveFromSeat={handleRemoveFromSeat}
            onEmergencyUnavailable={onEmergencyUnavailable ? handleEmergencyUnavailable : undefined}
            disabled={isReadOnly}
            isEmergencyMode={isEmergencyMode}
        >
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
            <span className={cn(
                "absolute top-0.5 left-0.5 sm:top-1 sm:left-1 text-[9px] sm:text-[10px] pointer-events-none",
                isOccupied
                    ? "text-white/60 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
                    : "text-[var(--color-text-secondary)]"
            )}>
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
        </SeatContextMenu>
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
                // 줄반장 표시: 보라 글로우 + 흰색 링 (모든 파트와 대비)
                isRowLeader && 'ring-[3px] ring-white ring-offset-2 ring-offset-violet-500 shadow-[0_0_10px_3px_rgba(139,92,246,0.5)]',
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
            {/* 줄반장 아이콘 표시: 흰색 원형 배경 + 보라 크라운 */}
            {isRowLeader && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-violet-400">
                    <Crown className="w-3.5 h-3.5 text-violet-600 fill-violet-300" />
                </div>
            )}
        </div>
    );
});
