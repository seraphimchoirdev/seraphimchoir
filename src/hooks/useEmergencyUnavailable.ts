import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCallback } from 'react';

import { useUpdateArrangement } from '@/hooks/useArrangements';
import { useUpdateSeats } from '@/hooks/useSeats';

import { createLogger } from '@/lib/logger';

import { getPartSide, useArrangementStore } from '@/store/arrangement-store';

import type { Database, Json } from '@/types/database.types';

const logger = createLogger({ prefix: 'EmergencyUnavailable' });

type Part = Database['public']['Enums']['part'];

/**
 * 긴급 등단 불가 처리 파라미터
 * - part 필드 추가: 파트 영역 고려를 위해 필수
 */
interface EmergencyUnavailableParams {
  memberId: string;
  memberName: string;
  part: Part; // ⭐ 파트 정보 (파트 영역 고려를 위해 필수)
  row: number;
  col: number;
}

interface UseEmergencyUnavailableOptions {
  /** 배치표 ID (gridLayout 자동 저장용) */
  arrangementId: string;
  date: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  /** 크로스-행 이동 사용 여부 (기본: true) */
  enableCrossRowMove?: boolean;
  /** 크로스-행 이동 임계값 (기본: 2) */
  crossRowThreshold?: number;
}

/**
 * 긴급 등단 불가 처리 훅 (파트 영역 고려 버전)
 *
 * 핵심 원칙:
 * 1. 전면 재배치 금지 - 예배 직전 대혼란 방지
 * 2. 항상 최소 변동 우선 - 인원 수와 관계없이
 * 3. 변동 파트 영역 내에서만 조정
 * 4. 오른쪽 → 왼쪽 당기기 방향
 *
 * 동작 순서:
 * 1. DB 업데이트 (is_service_available = false)
 * 2. 좌석에서 제거
 * 3. 같은 파트 멤버만 왼쪽으로 당기기
 * 4. (선택적) 행 간 불균형 시 뒷줄에서 앞줄로 이동
 * 5. 해당 행 용량 축소 (파트 side에 따라 좌/우)
 */
export function useEmergencyUnavailable({
  arrangementId,
  date,
  onSuccess,
  onError,
  enableCrossRowMove = true,
  crossRowThreshold = 2,
}: UseEmergencyUnavailableOptions) {
  const queryClient = useQueryClient();
  const updateArrangement = useUpdateArrangement();
  const updateSeats = useUpdateSeats();

  // Store state & actions
  const removeMember = useArrangementStore((state) => state.removeMember);
  const pullSamePartMembersLeft = useArrangementStore((state) => state.pullSamePartMembersLeft);
  const shrinkRowFromSide = useArrangementStore((state) => state.shrinkRowFromSide);
  const crossRowFillFromBack = useArrangementStore((state) => state.crossRowFillFromBack);
  const shouldCrossRowMove = useArrangementStore((state) => state.shouldCrossRowMove);
  const findLastEmptyColForPart = useArrangementStore((state) => state.findLastEmptyColForPart);
  const toggleRowLeader = useArrangementStore((state) => state.toggleRowLeader);

  // 출석 데이터 업데이트 mutation
  // ⭐ onSuccess 제거: handleEmergencyUnavailable에서 직접 await하여 캐시 무효화
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
              is_service_available: false,
              is_practice_attended: true, // 연습 참석 여부는 변경하지 않음
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
    // onSuccess 제거 - 캐시 무효화는 handleEmergencyUnavailable에서 await로 처리
  });

  const handleEmergencyUnavailable = useCallback(
    async ({ memberId, memberName, part, row, col }: EmergencyUnavailableParams) => {
      try {
        logger.debug(`[Emergency] 등단 불가 처리 시작: ${memberName}(${part}) at (${row}, ${col})`);

        // 1. DB 업데이트
        await updateAttendanceMutation.mutateAsync({ memberId });

        // 1.5. ⭐ 캐시 무효화 + refetch 완료 대기
        // invalidateQueries에 await를 사용하면 refetch가 완료될 때까지 기다림
        // → totalMembers와 MemberSidebar가 즉시 업데이트됨
        logger.debug(`[Emergency] 출석 캐시 무효화 및 refetch 대기 중...`);
        await queryClient.invalidateQueries({ queryKey: ['attendances', { date }] });
        logger.debug(`[Emergency] 출석 캐시 refetch 완료`);

        // 2. 줄반장 여부 확인 (제거 전에 체크)
        const seatKey = `${row}-${col}`;
        const currentAssignments = useArrangementStore.getState().assignments;
        const removedMember = currentAssignments[seatKey];
        const wasRowLeader = removedMember?.isRowLeader;

        // 3. 좌석에서 제거
        removeMember(row, col);

        // 4. 같은 행에서 "같은 파트" 멤버만 왼쪽으로 당기기
        pullSamePartMembersLeft(row, col, part);

        // 4.5. 줄반장이었으면 후임 지정
        if (wasRowLeader) {
          const stateAfterPull = useArrangementStore.getState();
          const sameRowSamePart = Object.values(stateAfterPull.assignments)
            .filter((a) => a.row === row && a.part === part)
            .sort((a, b) => a.col - b.col);
          if (sameRowSamePart.length > 0) {
            toggleRowLeader(row, sameRowSamePart[0].col, { silent: true });
            logger.debug(
              `[Emergency] 줄반장 후임 지정: ${sameRowSamePart[0].memberName} (${row}행 ${sameRowSamePart[0].col}열)`
            );
          }
        }

        // 5. 크로스-행 이동 로직 (선택적)
        const side = getPartSide(part);
        let crossRowMoved = false;

        if (enableCrossRowMove) {
          // 당기기 후 빈 열 찾기
          const emptyCol = findLastEmptyColForPart(row, part);

          // 행 간 불균형 확인
          if (emptyCol && shouldCrossRowMove(row, part, crossRowThreshold)) {
            // 뒷줄에서 앞줄로 이동 시도
            crossRowMoved = crossRowFillFromBack(row, emptyCol, part);

            if (crossRowMoved) {
              // 뒷줄 정리: 당기기 + 용량 축소
              const backRow = row + 1;
              const backEmptyCol = findLastEmptyColForPart(backRow, part);

              if (backEmptyCol) {
                pullSamePartMembersLeft(backRow, backEmptyCol, part);
              }

              // 뒷줄 용량 축소
              shrinkRowFromSide(backRow, side);
              logger.debug(`[Emergency] 크로스-행 이동 완료: ${backRow}행 → ${row}행`);
            } else {
              // 크로스-행 이동 실패 시 현재 행만 축소
              shrinkRowFromSide(row, side);
            }
          } else {
            // 크로스-행 이동 불필요 시 현재 행만 축소
            shrinkRowFromSide(row, side);
          }
        } else {
          // 5. 크로스-행 이동 비활성화 시: 단순히 해당 행 축소
          shrinkRowFromSide(row, side);
        }

        // 6. 빈 마지막 행 정리 (rowCapacity=0 또는 멤버 없는 마지막 행)
        {
          const stateForCleanup = useArrangementStore.getState();
          const caps = stateForCleanup.gridLayout?.rowCapacities;
          if (caps && caps.length > 1) {
            let trimmed = false;
            while (caps.length > 1 && caps[caps.length - 1] === 0) {
              caps.pop();
              trimmed = true;
            }
            // 마지막 행에 용량은 있지만 멤버가 없는 경우도 정리
            while (caps.length > 1) {
              const lastRow = caps.length;
              const hasMembers = Object.values(stateForCleanup.assignments).some(
                (a) => a.row === lastRow
              );
              if (!hasMembers && caps[lastRow - 1] <= 1) {
                caps.pop();
                trimmed = true;
              } else {
                break;
              }
            }
            if (trimmed) {
              useArrangementStore.setState({
                gridLayout: {
                  ...stateForCleanup.gridLayout!,
                  rows: caps.length,
                  rowCapacities: caps,
                },
              });
              logger.debug(`[Emergency] 빈 마지막 행 정리 완료: ${caps.length}행`);
            }
          }
        }

        // 7. ⭐ gridLayout과 seats를 DB에 자동 저장
        // zustand store에서 최신 상태 가져오기
        const currentState = useArrangementStore.getState();
        const { gridLayout: updatedGridLayout, assignments: updatedAssignments } = currentState;

        logger.debug(`[Emergency] gridLayout 및 seats 자동 저장 시작...`);

        // gridLayout 저장
        await updateArrangement.mutateAsync({
          id: arrangementId,
          data: {
            grid_layout: updatedGridLayout as Json,
            grid_rows: updatedGridLayout?.rows || 6,
          },
        });

        // seats 저장
        const seatsData = Object.values(updatedAssignments).map((a) => ({
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

        // 8. 성공 메시지
        const crossRowInfo = crossRowMoved ? ' (뒷줄에서 1명 이동)' : '';
        const message = `${memberName}님이 등단 불가로 처리되었습니다.${crossRowInfo}`;

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
      queryClient,
      updateAttendanceMutation,
      updateArrangement,
      updateSeats,
      arrangementId,
      removeMember,
      pullSamePartMembersLeft,
      shrinkRowFromSide,
      crossRowFillFromBack,
      shouldCrossRowMove,
      findLastEmptyColForPart,
      toggleRowLeader,
      enableCrossRowMove,
      crossRowThreshold,
      onSuccess,
      onError,
      date,
    ]
  );

  return {
    handleEmergencyUnavailable,
    isLoading: updateAttendanceMutation.isPending,
    error: updateAttendanceMutation.error,
  };
}
