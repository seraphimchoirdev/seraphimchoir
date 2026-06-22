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
  serviceScheduleId?: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useEmergencyUndo({
  arrangementId,
  date,
  serviceScheduleId,
  onSuccess,
  onError,
}: UseEmergencyUndoOptions) {
  const queryClient = useQueryClient();
  const updateArrangement = useUpdateArrangement();
  const updateSeats = useUpdateSeats();

  const undoLastEmergencyChange = useArrangementStore((state) => state.undoLastEmergencyChange);
  const getLastEmergencySnapshot = useArrangementStore((state) => state.getLastEmergencySnapshot);
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
              ...(serviceScheduleId && { service_schedule_id: serviceScheduleId }),
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
      // 1. 마지막 변동 정보를 peek (Store 미변경)
      const lastChange = getLastEmergencySnapshot();
      if (!lastChange) {
        onError?.('되돌릴 변동이 없습니다');
        return;
      }

      if (!lastChange.beforeSnapshot) {
        onError?.('이 변동은 되돌릴 수 없습니다 (스냅샷 없음)');
        return;
      }

      logger.debug(`[Undo] 되돌리기 시작: ${lastChange.type} - ${lastChange.memberName}`);

      // 2. DB 복원 먼저 (실패 시 Store 변경 없이 종료)
      // 좌석 전용 변동(빈자리 정리 등)은 출석을 바꾸지 않았으므로 출석 복원을 건너뜀.
      // (가짜 memberId를 출석 API에 보내 검증 실패하는 것을 방지)
      if (!lastChange.skipAttendanceRestore) {
        const restoreAvailable = lastChange.type === 'UNAVAILABLE';
        await restoreAttendanceMutation.mutateAsync({
          memberId: lastChange.memberId,
          isServiceAvailable: restoreAvailable,
        });

        // 3. 출석 캐시 무효화 (출석을 실제로 복원한 경우에만)
        await queryClient.invalidateQueries({ queryKey: ['attendances', { date }] });
      }

      // 4. beforeSnapshot 데이터로 DB에 저장 (gridLayout + seats)
      const { beforeSnapshot } = lastChange;
      if (beforeSnapshot.gridLayout) {
        await updateArrangement.mutateAsync({
          id: arrangementId,
          data: {
            grid_layout: beforeSnapshot.gridLayout as unknown as Json,
            grid_rows: beforeSnapshot.gridLayout.rows,
          },
        });

        const seatsData = Object.values(beforeSnapshot.assignments).map((a) => ({
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

      // 5. DB 성공 후에만 Store 복원 (undoLastEmergencyChange = Store 복원 + changes pop)
      const removedChange = undoLastEmergencyChange();
      if (!removedChange) {
        onError?.('Store 복원에 실패했습니다');
        return;
      }

      // 6. arrangements 캐시도 무효화
      await queryClient.invalidateQueries({ queryKey: ['arrangements'] });

      const typeLabel = removedChange.type === 'UNAVAILABLE' ? '등단 불가' : '등단 가능';
      const message = removedChange.skipAttendanceRestore
        ? `${removedChange.memberName}이(가) 되돌려졌습니다.`
        : `${removedChange.memberName}님의 ${typeLabel} 처리가 되돌려졌습니다.`;
      logger.debug(`[Undo] 완료: ${message}`);
      onSuccess?.(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : '되돌리기에 실패했습니다';
      logger.error(`[Undo] 오류:`, error);
      onError?.(message);
    }
  }, [
    changes,
    getLastEmergencySnapshot,
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
