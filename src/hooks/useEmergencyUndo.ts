/**
 * 긴급 변동 되돌리기 훅
 *
 * EmergencyChangesBanner에서 마지막 1건 되돌리기를 수행합니다.
 * - 로컬 상태 복원 (beforeSnapshot)
 * - DB 복원: 출석 상태, gridLayout, seats
 * - React Query 캐시 무효화
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCallback } from 'react';

import { useUpdateArrangement } from '@/hooks/useArrangements';
import { useUpdateSeats } from '@/hooks/useSeats';

import { createLogger } from '@/lib/logger';

import { useArrangementStore } from '@/store/arrangement-store';

import type { Json } from '@/types/database.types';

const logger = createLogger({ prefix: 'EmergencyUndo' });

interface UseEmergencyUndoOptions {
  arrangementId: string;
  date: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useEmergencyUndo({
  arrangementId,
  date,
  onSuccess,
  onError,
}: UseEmergencyUndoOptions) {
  const queryClient = useQueryClient();
  const updateArrangement = useUpdateArrangement();
  const updateSeats = useUpdateSeats();

  const undoLastEmergencyChange = useArrangementStore((state) => state.undoLastEmergencyChange);
  const changes = useArrangementStore((state) => state.emergencyChanges.changes);

  // 출석 상태 복원 mutation
  const restoreAttendanceMutation = useMutation({
    mutationFn: async ({
      memberId,
      isServiceAvailable,
    }: {
      memberId: string;
      isServiceAvailable: boolean;
    }) => {
      const response = await fetch('/api/attendances/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendances: [
            {
              member_id: memberId,
              date,
              is_service_available: isServiceAvailable,
              is_practice_attended: true,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '출석 기록 복원에 실패했습니다');
      }

      return response.json();
    },
  });

  const handleUndo = useCallback(async () => {
    try {
      // 마지막 변동 정보 확인 (제거 전)
      const lastChange = changes[changes.length - 1];
      if (!lastChange) {
        onError?.('되돌릴 변동이 없습니다');
        return;
      }

      if (!lastChange.beforeSnapshot) {
        onError?.('이 변동은 되돌릴 수 없습니다 (스냅샷 없음)');
        return;
      }

      logger.debug(`[Undo] 되돌리기 시작: ${lastChange.type} - ${lastChange.memberName}`);

      // 1. 로컬 상태 복원 (store)
      const removedChange = undoLastEmergencyChange();
      if (!removedChange) {
        onError?.('되돌릴 변동이 없습니다');
        return;
      }

      // 2. 출석 상태 DB 복원
      const restoreAvailable = removedChange.type === 'UNAVAILABLE'; // 등단 불가 → 등단 가능으로 복원
      await restoreAttendanceMutation.mutateAsync({
        memberId: removedChange.memberId,
        isServiceAvailable: restoreAvailable,
      });

      // 3. 캐시 무효화
      await queryClient.invalidateQueries({ queryKey: ['attendances', { date }] });

      // 4. 복원된 상태를 DB에 저장 (gridLayout + seats)
      const restoredState = useArrangementStore.getState();
      const { gridLayout, assignments } = restoredState;

      if (gridLayout) {
        await updateArrangement.mutateAsync({
          id: arrangementId,
          data: {
            grid_layout: gridLayout as unknown as Json,
            grid_rows: gridLayout.rows,
          },
        });

        const seatsData = Object.values(assignments).map((a) => ({
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
      }

      // 5. arrangements 캐시도 무효화
      await queryClient.invalidateQueries({ queryKey: ['arrangements'] });

      const typeLabel = removedChange.type === 'UNAVAILABLE' ? '등단 불가' : '등단 가능';
      const message = `${removedChange.memberName}님의 ${typeLabel} 처리가 되돌려졌습니다.`;
      logger.debug(`[Undo] 완료: ${message}`);
      onSuccess?.(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : '되돌리기에 실패했습니다';
      logger.error(`[Undo] 오류:`, error);
      onError?.(message);
    }
  }, [
    changes,
    undoLastEmergencyChange,
    restoreAttendanceMutation,
    queryClient,
    updateArrangement,
    updateSeats,
    arrangementId,
    date,
    onSuccess,
    onError,
  ]);

  // canUndo: 마지막 변동에 beforeSnapshot이 있어야 되돌리기 가능
  const lastChange = changes.length > 0 ? changes[changes.length - 1] : null;
  const canUndo = lastChange != null && lastChange.beforeSnapshot != null;

  return {
    handleUndo,
    canUndo,
    isLoading: restoreAttendanceMutation.isPending,
  };
}
