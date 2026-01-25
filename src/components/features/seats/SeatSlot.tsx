'use client';
'use memo';

import { ArrowRight, Crown, UserPlus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { memo, useCallback } from 'react';

import { cn } from '@/lib/utils';

import { useArrangementStore } from '@/store/arrangement-store';

import type { Database } from '@/types/database.types';
import type { ChangeHighlight } from '@/types/emergency-changes';

import SeatContextMenu from './SeatContextMenu';

type Part = Database['public']['Enums']['part'];

interface SeatSlotProps {
  row: number;
  col: number;
  onEmergencyUnavailable?: (params: {
    memberId: string;
    memberName: string;
    part: Part; // 파트 정보 (파트 영역 고려를 위해 필수)
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

  // 긴급 변동 하이라이트 (해당 멤버에 대한 하이라이트 여부)
  const changeHighlight = useArrangementStore((state) => {
    if (!assignment) return null;
    return state.emergencyChanges.highlights.get(assignment.memberId) || null;
  });

  // 선택된 위치가 이 좌석인지 확인 (shallow 비교)
  const isSelectedSeat = useArrangementStore(
    useShallow(
      (state) =>
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
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (assignment && !rowLeaderMode) {
        removeMemberAction(row, col);
      }
    },
    [assignment, rowLeaderMode, removeMemberAction, row, col]
  );

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
        part: assignment.part, // 파트 정보 전달 (파트 영역 고려를 위해 필수)
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
          'h-[36px] w-[48px] sm:h-12 sm:w-16 lg:h-[54px] lg:w-[72px]',
          'flex items-center justify-center rounded-lg border p-0.5 sm:p-1',
          'relative touch-manipulation transition-all duration-200',
          // Empty seat, no selection
          !isOccupied &&
            !hasSelection &&
            'border-dashed border-[var(--color-border-default)] bg-[var(--color-background-primary)]',
          // Empty seat, with selection (valid target)
          !isOccupied &&
            hasSelection &&
            'animate-pulse border-2 border-solid border-[var(--color-success-400)] bg-[var(--color-success-50)]',
          // Occupied seat, with selection (swappable)
          isOccupied &&
            hasSelection &&
            !isSelectedSeat &&
            'border-2 border-solid border-[var(--color-primary-400)] bg-[var(--color-primary-50)]',
          // This seat is selected (from grid)
          isSelectedSeat && 'ring-2 ring-[var(--color-primary-500)] ring-offset-1',
          // Normal occupied seat
          isOccupied &&
            !hasSelection &&
            'border-solid border-[var(--color-border-default)] bg-[var(--color-background-primary)]'
        )}
        role="button"
        aria-label={`좌석 ${row}행 ${col}열${assignment ? ` - ${assignment.memberName} 배치됨` : ''}`}
        aria-pressed={isSelectedSeat}
      >
        <span
          className={cn(
            'pointer-events-none absolute top-0.5 left-0.5 text-[9px] sm:top-1 sm:left-1 sm:text-[10px]',
            isOccupied
              ? 'text-white/60 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]'
              : 'text-[var(--color-text-secondary)]'
          )}
        >
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
            changeHighlight={changeHighlight}
          />
        ) : (
          <div className="pointer-events-none text-[10px] text-[var(--color-text-disabled)] sm:text-xs">
            빈 좌석
          </div>
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
  changeHighlight,
}: {
  name: string;
  part: Part;
  row: number;
  col: number;
  isRowLeader?: boolean;
  rowLeaderMode?: boolean;
  changeHighlight?: ChangeHighlight;
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

  // 변동 하이라이트 스타일
  const getHighlightStyle = () => {
    switch (changeHighlight) {
      case 'ADDED':
        return 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-emerald-100 shadow-[0_0_8px_2px_rgba(16,185,129,0.4)]';
      case 'MOVED':
        return 'ring-2 ring-amber-400 ring-offset-1 ring-offset-amber-100 shadow-[0_0_8px_2px_rgba(245,158,11,0.4)]';
      default:
        return '';
    }
  };

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center rounded-md border shadow-sm',
        'pointer-events-none', // Parent button handles all clicks
        'touch-manipulation transition-all duration-200',
        getPartColor(part),
        // 긴급 변동 하이라이트 (줄반장보다 우선)
        !isRowLeader && changeHighlight && getHighlightStyle(),
        // 줄반장 표시: 보라 글로우 + 흰색 링 (모든 파트와 대비)
        isRowLeader &&
          'shadow-[0_0_10px_3px_rgba(139,92,246,0.5)] ring-[3px] ring-white ring-offset-2 ring-offset-violet-500',
        // 줄반장 지정 모드일 때 호버 효과
        rowLeaderMode && 'cursor-pointer'
      )}
      title={
        isRowLeader
          ? '줄반장 (클릭하여 해제)'
          : rowLeaderMode
            ? '클릭하여 줄반장 지정'
            : '더블 클릭하여 제거'
      }
      role="presentation"
      aria-label={`${name} - ${part} 파트, ${row}행 ${col}열 배치됨${isRowLeader ? ' (줄반장)' : ''}${changeHighlight ? ` (${changeHighlight === 'ADDED' ? '새로 추가됨' : '이동됨'})` : ''}`}
    >
      <span className="max-w-full truncate px-0.5 text-center text-xs leading-tight font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] sm:text-sm lg:text-base">
        {name}
      </span>
      {/* 줄반장 아이콘 표시: 흰색 원형 배경 + 보라 크라운 */}
      {isRowLeader && (
        <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-violet-400 bg-white shadow-lg">
          <Crown className="h-3.5 w-3.5 fill-violet-300 text-violet-600" />
        </div>
      )}
      {/* 긴급 변동 아이콘 표시 (줄반장 아닌 경우) */}
      {!isRowLeader && changeHighlight === 'ADDED' && (
        <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 shadow-md">
          <UserPlus className="h-2.5 w-2.5 text-white" />
        </div>
      )}
      {!isRowLeader && changeHighlight === 'MOVED' && (
        <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 shadow-md">
          <ArrowRight className="h-2.5 w-2.5 text-white" />
        </div>
      )}
    </div>
  );
});
