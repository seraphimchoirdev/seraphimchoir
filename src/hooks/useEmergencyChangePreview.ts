/**
 * 긴급 변동 미리보기 훅
 *
 * 긴급 등단 불가/등단 가능 처리 시 발생할 변동 사항을 미리 계산합니다.
 * 실제 상태 변경 없이 시뮬레이션 결과만 반환합니다.
 */

import { useMemo } from 'react';
import { useArrangementStore } from '@/store/arrangement-store';
import type { Database } from '@/types/database.types';
import type {
    EmergencyChangePreview,
    UnavailableProcessMode,
    GridLayoutChange,
} from '@/types/emergency-changes';

type Part = Database['public']['Enums']['part'];

interface UseEmergencyChangePreviewParams {
    /** 대상 멤버 정보 */
    targetMember: {
        memberId: string;
        memberName: string;
        part: Part;
        row: number;
        col: number;
    } | null;
    /** 처리 방식 */
    processMode: UnavailableProcessMode;
    /** 다이얼로그 열림 상태 (열려있을 때만 계산) */
    isOpen: boolean;
}

interface UseEmergencyChangePreviewResult {
    /** 현재 선택된 처리 방식의 미리보기 */
    preview: EmergencyChangePreview | null;
    /** 빈 자리 유지 모드 미리보기 */
    leaveEmptyPreview: EmergencyChangePreview | null;
    /** 자동 당기기 모드 미리보기 */
    autoPullPreview: EmergencyChangePreview | null;
}

/**
 * 긴급 등단 불가 처리 미리보기 훅
 */
export function useEmergencyChangePreview({
    targetMember,
    processMode,
    isOpen,
}: UseEmergencyChangePreviewParams): UseEmergencyChangePreviewResult {
    // Store 시뮬레이션 함수들
    const simulateLeaveEmpty = useArrangementStore((state) => state.simulateLeaveEmpty);
    const simulateAutoPull = useArrangementStore((state) => state.simulateAutoPull);
    const gridLayout = useArrangementStore((state) => state.gridLayout);

    // 빈 자리 유지 모드 시뮬레이션
    const leaveEmptyPreview = useMemo<EmergencyChangePreview | null>(() => {
        if (!isOpen || !targetMember || !gridLayout) return null;

        const result = simulateLeaveEmpty(targetMember.row, targetMember.col);

        // 그리드 레이아웃 변경 계산 (빈 자리 유지 모드에서는 변경 없음)
        const rowCapacityChanges: GridLayoutChange[] = [];

        return {
            targetMember: {
                memberId: targetMember.memberId,
                memberName: targetMember.memberName,
                part: targetMember.part,
                position: { row: targetMember.row, col: targetMember.col },
            },
            cascadeChanges: result.cascadeChanges,
            gridLayoutChanges: {
                rowCapacityChanges,
            },
            movedMemberCount: result.movedMemberCount,
            simulatedAssignments: result.assignments,
            simulatedGridLayout: result.gridLayout,
        };
    }, [isOpen, targetMember, gridLayout, simulateLeaveEmpty]);

    // 자동 당기기 모드 시뮬레이션
    const autoPullPreview = useMemo<EmergencyChangePreview | null>(() => {
        if (!isOpen || !targetMember || !gridLayout) return null;

        const result = simulateAutoPull(
            targetMember.row,
            targetMember.col,
            targetMember.part
        );

        // 그리드 레이아웃 변경 계산
        const rowCapacityChanges: GridLayoutChange[] = [];
        result.gridLayout.rowCapacities.forEach((newCapacity, idx) => {
            const oldCapacity = gridLayout.rowCapacities[idx];
            if (newCapacity !== oldCapacity) {
                rowCapacityChanges.push({
                    row: idx + 1,
                    before: oldCapacity,
                    after: newCapacity,
                });
            }
        });

        return {
            targetMember: {
                memberId: targetMember.memberId,
                memberName: targetMember.memberName,
                part: targetMember.part,
                position: { row: targetMember.row, col: targetMember.col },
            },
            cascadeChanges: result.cascadeChanges,
            gridLayoutChanges: {
                rowCapacityChanges,
            },
            movedMemberCount: result.movedMemberCount,
            simulatedAssignments: result.assignments,
            simulatedGridLayout: result.gridLayout,
        };
    }, [isOpen, targetMember, gridLayout, simulateAutoPull]);

    // 현재 선택된 모드에 따른 미리보기 반환
    const preview = useMemo<EmergencyChangePreview | null>(() => {
        switch (processMode) {
            case 'LEAVE_EMPTY':
                return leaveEmptyPreview;
            case 'AUTO_PULL':
                return autoPullPreview;
            case 'MANUAL':
                // 수동 모드에서는 빈 자리 유지 미리보기와 동일 (제거만 표시)
                return leaveEmptyPreview;
            default:
                return null;
        }
    }, [processMode, leaveEmptyPreview, autoPullPreview]);

    return {
        preview,
        leaveEmptyPreview,
        autoPullPreview,
    };
}

export default useEmergencyChangePreview;
