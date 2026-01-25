'use client';

import { Trash2, UserX } from 'lucide-react';

import { ReactNode, memo, useCallback, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SeatContextMenuProps {
  children: ReactNode;
  memberName?: string;
  memberId?: string;
  isOccupied: boolean;
  onRemoveFromSeat: () => void;
  onEmergencyUnavailable?: () => void;
  disabled?: boolean;
  /** 긴급 수정 모드 (SHARED 상태에서만 true) - 컨텍스트 메뉴 표시 조건 */
  isEmergencyMode?: boolean;
}

/**
 * 좌석 컨텍스트 메뉴 컴포넌트
 *
 * 배치된 좌석에서 우클릭 또는 길게 누르면 표시되는 메뉴
 * - 긴급 등단 불가 처리: 출석 데이터 업데이트 + 좌석에서 제거
 * - 좌석에서 제거: 좌석에서만 제거 (출석 상태 유지)
 */
const SeatContextMenu = memo(function SeatContextMenu({
  children,
  memberName: _memberName, // 추후 컨텍스트 메뉴에 이름 표시용
  isOccupied,
  onRemoveFromSeat,
  onEmergencyUnavailable,
  disabled = false,
  isEmergencyMode = false,
}: SeatContextMenuProps) {
  const [open, setOpen] = useState(false);

  const handleEmergencyUnavailable = useCallback(() => {
    onEmergencyUnavailable?.();
    setOpen(false);
  }, [onEmergencyUnavailable]);

  const handleRemoveFromSeat = useCallback(() => {
    onRemoveFromSeat();
    setOpen(false);
  }, [onRemoveFromSeat]);

  // 빈 좌석이거나 비활성화된 경우, 또는 긴급 수정 모드가 아닌 경우 컨텍스트 메뉴 없이 children만 렌더링
  // SHARED 상태에서만 긴급 수정 컨텍스트 메뉴가 표시됨
  if (!isOccupied || disabled || !isEmergencyMode) {
    return <>{children}</>;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        {onEmergencyUnavailable && (
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
            onClick={handleEmergencyUnavailable}
          >
            <UserX className="h-4 w-4" />
            <span>긴급 등단 불가 처리</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={handleRemoveFromSeat}>
          <Trash2 className="h-4 w-4" />
          <span>좌석에서 제거</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default SeatContextMenu;
