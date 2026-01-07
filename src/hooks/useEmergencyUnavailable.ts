import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useArrangementStore, type SeatAssignment } from '@/store/arrangement-store';
import { recommendRowDistribution, type PartCounts } from '@/lib/row-distribution-recommender';
import type { MinimalReassignmentResult } from '@/lib/minimal-reassignment';
import { DEFAULT_PART_ZONES, type PartZone } from '@/lib/part-zone-analyzer';
import type { Database } from '@/types/database.types';

type Part = Database['public']['Enums']['part'];

/**
 * 현재 배치에서 파트별 인원 계산
 * @param assignments 현재 배치 상태
 * @param excludeMemberId 제외할 멤버 ID (등단 불가 처리될 멤버)
 */
function getPartCountsFromAssignments(
    assignments: Record<string, SeatAssignment>,
    excludeMemberId?: string
): PartCounts {
    const counts: PartCounts = {};

    Object.values(assignments).forEach((a) => {
        if (a.memberId !== excludeMemberId) {
            counts[a.part] = (counts[a.part] || 0) + 1;
        }
    });

    return counts;
}

/**
 * ALTO 미배치 방지: 1-4행 좌석 유지하면서 5-6행에서만 감소
 *
 * 문제: 그리드 축소 시 1-4행의 열이 줄어들면 ALTO 멤버가 경계 밖으로 밀려남
 * 해결: 1-4행의 좌석 수를 유지하고, 5-6행에서만 줄임
 *
 * @param currentCapacities 현재 행별 좌석 수
 * @param seatsToRemove 줄여야 할 총 좌석 수
 * @returns 조정된 행별 좌석 수
 */
function adjustGridPreservingFrontRows(
    currentCapacities: number[],
    seatsToRemove: number
): number[] {
    const adjusted = [...currentCapacities];
    let remaining = seatsToRemove;

    // 5-6행(인덱스 4, 5)에서만 감소, 뒤에서부터 (6행 우선)
    for (const rowIdx of [5, 4]) {
        while (remaining > 0 && rowIdx < adjusted.length && adjusted[rowIdx] > 1) {
            adjusted[rowIdx]--;
            remaining--;
        }
    }

    // 5-6행에서 모두 줄이지 못한 경우 (극단적 케이스)
    // 4행부터 앞으로 줄임 (ALTO가 가장 적은 행부터)
    if (remaining > 0) {
        for (let rowIdx = 3; rowIdx >= 0 && remaining > 0; rowIdx--) {
            if (rowIdx < adjusted.length && adjusted[rowIdx] > 1) {
                adjusted[rowIdx]--;
                remaining--;
            }
        }
    }

    return adjusted;
}

interface EmergencyUnavailableParams {
    memberId: string;
    memberName: string;
    row: number;
    col: number;
}

interface UseEmergencyUnavailableOptions {
    date: string;
    /** 그리드 재계산 콜백 (기존 방식, 최소 변동 미사용 시) */
    onGridRecalculate?: (recommendation: ReturnType<typeof recommendRowDistribution>) => void;
    getCurrentMemberCount: () => number;
    onSuccess?: (message: string) => void;
    onError?: (message: string) => void;
    /** 최소 변동 재배치 사용 여부 (기본: true) */
    useMinimalReassignment?: boolean;
    /** 커스텀 파트 영역 (없으면 기본값 사용) */
    partZones?: Map<Part, PartZone>;
}

/**
 * 긴급 등단 불가 처리 훅
 *
 * 예배 당일 갑자기 등단 못한다고 연락이 왔을 때:
 * 1. 출석 데이터 업데이트 (is_service_available = false)
 * 2. 좌석에서 자동 제거
 * 3. React Query 캐시 무효화 → totalMembers 자동 재계산
 * 4. 최소 변동 재배치 또는 AI 추천 그리드 자동 적용
 */
export function useEmergencyUnavailable({
    date,
    onGridRecalculate,
    getCurrentMemberCount,
    onSuccess,
    onError,
    useMinimalReassignment = true,
    partZones,
}: UseEmergencyUnavailableOptions) {
    const queryClient = useQueryClient();
    const removeMember = useArrangementStore((state) => state.removeMember);
    const applyMinimalReassignment = useArrangementStore((state) => state.applyMinimalReassignment);
    const gridLayout = useArrangementStore((state) => state.gridLayout);

    // 출석 데이터 업데이트 mutation
    const updateAttendanceMutation = useMutation({
        mutationFn: async ({ memberId }: { memberId: string }) => {
            const response = await fetch('/api/attendances/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendances: [{
                        member_id: memberId,
                        date,
                        is_service_available: false,
                        is_practice_attended: true, // 연습 참석 여부는 변경하지 않음
                    }],
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '출석 기록 업데이트에 실패했습니다');
            }

            return response.json();
        },
        onSuccess: () => {
            // 출석 캐시 무효화 → MemberSidebar와 totalMembers 자동 재계산
            queryClient.invalidateQueries({ queryKey: ['attendances'] });
        },
    });

    const handleEmergencyUnavailable = useCallback(
        async ({ memberId, memberName, row, col }: EmergencyUnavailableParams) => {
            try {
                // 1. 출석 데이터 업데이트
                await updateAttendanceMutation.mutateAsync({ memberId });

                // 2. 새로운 인원 수 계산
                const newMemberCount = getCurrentMemberCount() - 1;

                if (newMemberCount <= 0) {
                    removeMember(row, col);
                    onSuccess?.(`${memberName}님이 등단 불가로 처리되었습니다.`);
                    return;
                }

                // 3. 파트별 인원 계산 (제거될 멤버 제외)
                const currentAssignments = useArrangementStore.getState().assignments;
                const partCounts = getPartCountsFromAssignments(currentAssignments, memberId);

                // 4. 새 그리드 레이아웃 계산
                // ALTO 미배치 방지: 현재 그리드를 기반으로 5-6행에서만 좌석 감소
                const currentCapacities = gridLayout?.rowCapacities || [];
                const hasAltoMembers = (partCounts.ALTO || 0) > 0;

                let newLayout;
                if (hasAltoMembers && currentCapacities.length > 0) {
                    // ALTO 멤버가 있으면 현재 그리드 기반으로 1-4행 보호
                    const adjustedCapacities = adjustGridPreservingFrontRows(currentCapacities, 1);
                    newLayout = {
                        rows: adjustedCapacities.length,
                        rowCapacities: adjustedCapacities,
                        zigzagPattern: gridLayout?.zigzagPattern || 'even' as const,
                    };
                    console.log('[Emergency] ALTO 보호 모드 - 5-6행에서만 좌석 감소:', {
                        before: currentCapacities,
                        after: adjustedCapacities,
                        altoCount: partCounts.ALTO,
                    });
                } else {
                    // ALTO 멤버가 없으면 기존 추천 로직 사용
                    const recommendation = recommendRowDistribution(newMemberCount, partCounts);
                    newLayout = {
                        rows: recommendation.rows,
                        rowCapacities: recommendation.rowCapacities,
                        zigzagPattern: gridLayout?.zigzagPattern || 'even' as const,
                    };
                }

                // 5. 최소 변동 재배치 또는 기존 방식 선택
                if (useMinimalReassignment) {
                    // 먼저 좌석에서 제거
                    removeMember(row, col);

                    // 파트 영역 설정
                    const zones = partZones || new Map(
                        (['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] as Part[]).map(
                            (part) => [part, DEFAULT_PART_ZONES[part]]
                        )
                    );

                    // 최소 변동 재배치 실행
                    const result: MinimalReassignmentResult = applyMinimalReassignment(
                        { row, col },
                        newLayout,
                        zones
                    );

                    // 결과 메시지 생성
                    const { stats, unassignedMembers } = result;
                    let message = `${memberName}님이 등단 불가로 처리되었습니다.`;

                    if (stats.totalMoved > 0) {
                        message += ` ${stats.totalMoved}명이 자동 재배치되었습니다.`;
                        if (stats.sameRowMoves > 0) {
                            message += ` (같은 행 이동: ${stats.sameRowMoves}명)`;
                        }
                    }

                    if (unassignedMembers.length > 0) {
                        const names = unassignedMembers.map((m) => m.memberName).join(', ');
                        message += ` 미배치: ${names}`;
                    }

                    onSuccess?.(message);
                } else {
                    // 기존 방식: 좌석 제거 후 그리드 재계산
                    removeMember(row, col);

                    if (onGridRecalculate) {
                        // 기존 방식에서도 ALTO 보호를 위해 recommendRowDistribution 호출
                        const recommendation = recommendRowDistribution(newMemberCount, partCounts);
                        onGridRecalculate(recommendation);
                        onSuccess?.(
                            `${memberName}님이 등단 불가로 처리되었습니다. 그리드가 ${newMemberCount}명 기준으로 재설정되었습니다.`
                        );
                    } else {
                        onSuccess?.(`${memberName}님이 등단 불가로 처리되었습니다.`);
                    }
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : '처리에 실패했습니다';
                onError?.(message);
                throw error;
            }
        },
        [
            updateAttendanceMutation,
            removeMember,
            getCurrentMemberCount,
            onGridRecalculate,
            onSuccess,
            onError,
            useMinimalReassignment,
            applyMinimalReassignment,
            gridLayout,
            partZones,
        ]
    );

    return {
        handleEmergencyUnavailable,
        isLoading: updateAttendanceMutation.isPending,
        error: updateAttendanceMutation.error,
    };
}
