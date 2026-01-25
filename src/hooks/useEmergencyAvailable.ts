/**
 * 긴급 등단 가능 처리 훅
 *
 * 공유(SHARED) 상태의 배치표에서 긴급하게 등단 가능해진 인원을 추가 배치합니다.
 * 핵심 원칙: 최소 변동 우선 - 기존 배치 변경 없이 빈 좌석 또는 행 확장으로 추가
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCallback } from 'react';

import { useUpdateArrangement } from '@/hooks/useArrangements';
import { useUpdateSeats } from '@/hooks/useSeats';

import { createLogger } from '@/lib/logger';

import { useArrangementStore } from '@/store/arrangement-store';

import type { Database, Json } from '@/types/database.types';
import type { AvailableProcessMode, CascadeChangeStep } from '@/types/emergency-changes';

const logger = createLogger({ prefix: 'EmergencyAvailable' });

type Part = Database['public']['Enums']['part'];

/**
 * 긴급 등단 가능 처리 파라미터
 */
interface EmergencyAvailableParams {
  memberId: string;
  memberName: string;
  part: Part;
}

interface UseEmergencyAvailableOptions {
  /** 배치표 ID */
  arrangementId: string;
  date: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

/**
 * 긴급 등단 가능 처리 훅
 *
 * 동작:
 * 1. DB 업데이트: is_service_available = true
 * 2. 파트 영역 내 빈 좌석 탐색 또는 행 확장
 * 3. 좌석 배치 및 DB 저장
 */
export function useEmergencyAvailable({
  arrangementId,
  date,
  onSuccess,
  onError,
}: UseEmergencyAvailableOptions) {
  const queryClient = useQueryClient();
  const updateArrangement = useUpdateArrangement();
  const updateSeats = useUpdateSeats();

  // Store actions
  const simulateAutoPlace = useArrangementStore((state) => state.simulateAutoPlace);
  const setGridLayout = useArrangementStore((state) => state.setGridLayout);
  const addEmergencyChange = useArrangementStore((state) => state.addEmergencyChange);

  // 출석 데이터 업데이트 mutation (등단 가능으로 변경)
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const response = await fetch('/api/attendances/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendances: [
            {
              member_id: memberId,
              date,
              is_service_available: true,
              is_practice_attended: true,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '출석 기록 업데이트에 실패했습니다');
      }

      return response.json();
    },
  });

  /**
   * 자동 배치 처리
   */
  const handleAutoPlace = useCallback(
    async ({ memberId, memberName, part }: EmergencyAvailableParams) => {
      try {
        logger.debug(`[Emergency] 등단 가능 자동 배치 시작: ${memberName}(${part})`);

        // 1. 시뮬레이션으로 배치 위치 결정
        const simulation = simulateAutoPlace(memberId, memberName, part);

        if (!simulation) {
          throw new Error('배치할 수 있는 위치를 찾을 수 없습니다');
        }

        // 2. DB 업데이트 (출석 상태)
        await updateAttendanceMutation.mutateAsync({ memberId });

        // 2.5. 캐시 무효화 + refetch 대기
        logger.debug(`[Emergency] 출석 캐시 무효화 및 refetch 대기 중...`);
        await queryClient.invalidateQueries({ queryKey: ['attendances'] });
        logger.debug(`[Emergency] 출석 캐시 refetch 완료`);

        // 3. Store 상태 업데이트 (assignments + gridLayout)
        const store = useArrangementStore.getState();
        const newAssignments = simulation.assignments;

        // assignments 직접 업데이트
        useArrangementStore.setState({
          assignments: newAssignments,
          gridLayout: simulation.gridLayout,
        });

        // 4. DB에 저장
        logger.debug(`[Emergency] gridLayout 및 seats 자동 저장 시작...`);

        // gridLayout 저장
        await updateArrangement.mutateAsync({
          id: arrangementId,
          data: {
            grid_layout: simulation.gridLayout as unknown as Json,
            grid_rows: simulation.gridLayout.rows,
          },
        });

        // seats 저장
        const seatsData = Object.values(newAssignments).map((a) => ({
          memberId: a.memberId,
          row: a.row,
          column: a.col,
          part: a.part,
          isRowLeader: a.isRowLeader || false,
        }));

        await updateSeats.mutateAsync({
          arrangementId,
          seats: seatsData,
        });

        logger.debug(`[Emergency] gridLayout 및 seats 저장 완료`);

        // 5. 변동 이력 기록
        const addedPosition = simulation.cascadeChanges.find((c) => c.type === 'ADD')?.to;
        addEmergencyChange({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'AVAILABLE',
          memberId,
          memberName,
          part,
          processMode: 'AUTO_PLACE',
          addedTo: addedPosition,
          cascadeChanges: simulation.cascadeChanges,
          movedMemberCount: simulation.movedMemberCount,
        });

        // 6. 성공 메시지
        const positionInfo = addedPosition
          ? ` (${addedPosition.row}행 ${addedPosition.col}열)`
          : '';
        const message = `${memberName}님이 등단 가능으로 변경되고 배치되었습니다${positionInfo}`;

        logger.debug(`[Emergency] 처리 완료: ${message}`);
        onSuccess?.(message);
      } catch (error) {
        const message = error instanceof Error ? error.message : '처리에 실패했습니다';
        logger.error(`[Emergency] 오류:`, error);
        onError?.(message);
        throw error;
      }
    },
    [
      simulateAutoPlace,
      updateAttendanceMutation,
      queryClient,
      updateArrangement,
      updateSeats,
      arrangementId,
      addEmergencyChange,
      onSuccess,
      onError,
    ]
  );

  /**
   * 수동 배치 처리 (출석 상태만 변경, 배치는 사용자가 직접)
   */
  const handleManualPlace = useCallback(
    async ({ memberId, memberName, part }: EmergencyAvailableParams) => {
      try {
        logger.debug(`[Emergency] 등단 가능 수동 배치 시작: ${memberName}(${part})`);

        // 1. DB 업데이트 (출석 상태만)
        await updateAttendanceMutation.mutateAsync({ memberId });

        // 2. 캐시 무효화 + refetch 대기
        await queryClient.invalidateQueries({ queryKey: ['attendances'] });

        // 3. 변동 이력 기록 (수동 배치는 cascadeChanges 최소화)
        addEmergencyChange({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'AVAILABLE',
          memberId,
          memberName,
          part,
          processMode: 'MANUAL',
          cascadeChanges: [
            {
              step: 1,
              type: 'ADD',
              description: `${memberName}(${part.charAt(0)}) 등단 가능으로 변경 (수동 배치 대기)`,
              memberId,
              memberName,
              part,
            },
          ],
          movedMemberCount: 0,
        });

        // 4. 성공 메시지
        const message = `${memberName}님이 등단 가능으로 변경되었습니다. 직접 배치해주세요.`;
        logger.debug(`[Emergency] 처리 완료: ${message}`);
        onSuccess?.(message);
      } catch (error) {
        const message = error instanceof Error ? error.message : '처리에 실패했습니다';
        logger.error(`[Emergency] 오류:`, error);
        onError?.(message);
        throw error;
      }
    },
    [updateAttendanceMutation, queryClient, addEmergencyChange, onSuccess, onError]
  );

  return {
    handleAutoPlace,
    handleManualPlace,
    simulateAutoPlace,
    isLoading: updateAttendanceMutation.isPending,
    error: updateAttendanceMutation.error,
  };
}

export default useEmergencyAvailable;
